import { toCsv } from '../../core/csvUtils.js'

const GENERIC_HEADERS = [
  'Zone',
  'Channel Name',
  'RX Frequency',
  'TX Frequency',
  'Tone',
  'Mode',
  'Callsign',
  'Location',
  'Notes',
]

export function exportGenericCsv(repeaters) {
  const rows = repeaters.map((repeater) => ({
    Zone: repeater.zone,
    'Channel Name': repeater.channelName,
    'RX Frequency': repeater.rxFrequency,
    'TX Frequency': repeater.txFrequency,
    Tone: repeater.tone,
    Mode: repeater.mode,
    Callsign: repeater.callsign,
    Location: repeater.location,
    Notes: repeater.notes,
  }))

  return toCsv(GENERIC_HEADERS, rows)
}
