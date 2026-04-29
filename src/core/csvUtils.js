export function parseCsv(text) {
  const rows = parseCsvRows(text)
  const meaningfulRows = rows.filter((row) =>
    row.some((cell) => cell.trim().length > 0),
  )

  if (meaningfulRows.length < 2) {
    throw new Error('The CSV needs a header row and at least one repeater row.')
  }

  const headers = meaningfulRows[0].map((header) =>
    header.trim().replace(/^\uFEFF/, ''),
  )
  const hasHeaders = headers.some(Boolean)

  if (!hasHeaders) {
    throw new Error('The CSV header row is empty.')
  }

  return meaningfulRows.slice(1).map((row) => {
    const record = {}
    headers.forEach((header, index) => {
      if (header) record[header] = row[index]?.trim() ?? ''
    })
    return record
  })
}

export function toCsv(headers, rows) {
  const lines = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((row) =>
      headers.map((header) => escapeCsvCell(row[header] ?? '')).join(','),
    ),
  ]

  return `${lines.join('\r\n')}\r\n`
}

function parseCsvRows(text) {
  const rows = []
  let row = []
  let cell = ''
  let inQuotes = false

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    const next = text[index + 1]

    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === ',' && !inQuotes) {
      row.push(cell)
      cell = ''
      continue
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
      if (char === '\r' && next === '\n') index += 1
      continue
    }

    cell += char
  }

  row.push(cell)
  rows.push(row)

  return rows
}

function escapeCsvCell(value) {
  const text = String(value)
  if (/[",\r\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`
  }
  return text
}
