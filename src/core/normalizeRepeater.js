const FIELD_ALIASES = {
  callsign: ['Callsign', 'Call Sign', 'Call', 'Input Call', 'Output Call'],
  location: ['Location', 'Nearest City', 'City', 'County', 'Landmark'],
  county: ['County'],
  state: ['State', 'Province'],
  frequency: [
    'Frequency',
    'Output Frequency',
    'Output Freq',
    'RX Frequency',
    'Receive Frequency',
  ],
  inputFrequency: [
    'Input Frequency',
    'Input Freq',
    'TX Frequency',
    'Transmit Frequency',
  ],
  offset: ['Offset', 'Offset Direction'],
  offsetMhz: ['Offset MHz', 'Offset Amount', 'Offset Frequency'],
  tone: ['Tone', 'PL', 'PL Tone', 'CTCSS', 'Access', 'Uplink Tone', 'TX Tone'],
  rxTone: ['RX Tone', 'Downlink Tone'],
  mode: ['Mode', 'Modes', 'Use', 'FM Mode'],
  bandwidth: ['Bandwidth', 'Spacing'],
  notes: ['Notes', 'Comments', 'Operational Notes'],
  digitalAccess: ['Digital Access', 'Color Code', 'CC', 'DCS'],
  name: ['Channel Name', 'Name', 'Repeater Name'],
}

const DISPLAY_NAME_MAX_LENGTH = 14

export function normalizeRepeater(row, options = {}) {
  const rxFrequency = cleanFrequency(readField(row, FIELD_ALIASES.frequency))
  const inputFrequency = cleanFrequency(readField(row, FIELD_ALIASES.inputFrequency))
  const txFrequency =
    inputFrequency || calculateTxFrequency(rxFrequency, row) || rxFrequency

  const callsign = readField(row, FIELD_ALIASES.callsign)
  const locationParts = [
    readField(row, FIELD_ALIASES.location),
    readField(row, FIELD_ALIASES.county),
    readField(row, FIELD_ALIASES.state),
  ].filter(Boolean)
  const location = [...new Set(locationParts)].join(', ')
  const tone = cleanTone(readField(row, FIELD_ALIASES.tone))
  const rxTone = cleanTone(readField(row, FIELD_ALIASES.rxTone))
  const sourceModes = readField(row, FIELD_ALIASES.mode)
  const mode = normalizeMode(sourceModes)
  const notes = buildNotes(row, sourceModes, mode)

  return {
    id: stableId(row, options.fallbackId),
    selected: true,
    zone: options.defaultZone || 'Unassigned',
    channelName: buildChannelName(row, callsign, rxFrequency),
    rxFrequency,
    txFrequency,
    tone,
    rxTone,
    mode,
    bandwidth: normalizeBandwidth(readField(row, FIELD_ALIASES.bandwidth)),
    power: 'High',
    talkaround: 'No',
    scanList: '',
    callsign,
    location,
    notes,
    source: row,
  }
}

function readField(row, aliases) {
  const normalizedMap = Object.entries(row).reduce((map, [key, value]) => {
    map[normalizeKey(key)] = value
    return map
  }, {})

  for (const alias of aliases) {
    const value = normalizedMap[normalizeKey(alias)]
    if (value) return String(value).trim()
  }

  return ''
}

function buildChannelName(row, callsign, rxFrequency) {
  const explicitName = readField(row, FIELD_ALIASES.name)
  const sourceLocation = readField(row, FIELD_ALIASES.location)
  const rawName =
    explicitName ||
    [callsign, rxFrequency, sourceLocation].filter(Boolean).join(' ')
  return rawName.slice(0, DISPLAY_NAME_MAX_LENGTH).trim() || 'Repeater'
}

function stableId(row, fallbackId = 'repeater') {
  const seed = [
    readField(row, FIELD_ALIASES.callsign),
    readField(row, FIELD_ALIASES.frequency),
    readField(row, FIELD_ALIASES.location),
    fallbackId,
  ]
    .filter(Boolean)
    .join('|')

  return seed
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function cleanFrequency(value) {
  const match = String(value).match(/\d+(?:\.\d+)?/)
  return match ? Number(match[0]).toFixed(5).replace(/0+$/, '').replace(/\.$/, '') : ''
}

function cleanTone(value) {
  const text = String(value || '').trim()
  if (!text || /^none$/i.test(text)) return ''
  return text
}

function buildNotes(row, sourceModes, mode) {
  const notes = readField(row, FIELD_ALIASES.notes)
  const digitalAccess = readField(row, FIELD_ALIASES.digitalAccess)
  const noteParts = []

  if (notes) noteParts.push(notes)
  if (sourceModes && sourceModes !== mode) noteParts.push(`RepeaterBook modes: ${sourceModes}`)
  if (digitalAccess) {
    const label = mode === 'DMR' ? 'Digital Access: CC' : 'Digital Access:'
    noteParts.push(`${label} ${digitalAccess}`.trim())
  }

  return noteParts.join(' | ')
}

function calculateTxFrequency(rxFrequency, row) {
  const rx = Number(rxFrequency)
  if (!rx) return ''

  const offsetDirection = readField(row, FIELD_ALIASES.offset)
  const offsetAmount = Number(cleanFrequency(readField(row, FIELD_ALIASES.offsetMhz)))

  if (!offsetAmount) return ''
  if (offsetDirection.includes('-')) return formatFrequency(rx - offsetAmount)
  if (offsetDirection.includes('+')) return formatFrequency(rx + offsetAmount)
  return ''
}

function formatFrequency(value) {
  return value.toFixed(5).replace(/0+$/, '').replace(/\.$/, '')
}

function normalizeMode(value) {
  const mode = String(value || '').trim().toUpperCase()
  if (mode.includes('D-STAR') || mode.includes('DSTAR')) return 'D-STAR'
  if (mode.includes('DMR')) return 'DMR'
  if (mode.includes('P25')) return 'P25'
  if (mode.includes('NXDN')) return 'NXDN'
  if (mode.includes('FM')) return 'FM'
  if (mode.includes('FUSION') || mode.includes('WIRES-X')) return 'Fusion'
  if (mode.includes('AM')) return 'AM'
  return 'FM'
}

function normalizeBandwidth(value) {
  const bandwidth = String(value || '').trim()
  if (/narrow|12\.5/i.test(bandwidth)) return 'Narrow'
  if (/wide|25/i.test(bandwidth)) return 'Wide'
  return 'Wide'
}

function normalizeKey(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]/g, '')
}
