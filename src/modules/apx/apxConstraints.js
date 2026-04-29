export const APX_NAME_MAX_LENGTH = 14

export function sanitizeApxName(value, maxLength = APX_NAME_MAX_LENGTH) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)
    .trim()
}

export function appendApxNameNotes(notes, repeater, zoneName, channelName) {
  const noteParts = [notes].filter(Boolean)

  if (repeater.zone && repeater.zone !== zoneName) {
    noteParts.push(`RB2 original zone: ${repeater.zone}`)
  }

  if (repeater.channelName && repeater.channelName !== channelName) {
    noteParts.push(`RB2 original channel: ${repeater.channelName}`)
  }

  return noteParts.join(' | ')
}
