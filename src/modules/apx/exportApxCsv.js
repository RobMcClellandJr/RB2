import { toCsv } from '../../core/csvUtils.js'
import { appendApxNameNotes, sanitizeApxName } from './apxConstraints.js'

const APX_HEADERS = [
  'Zone',
  'Channel Name',
  'RX Frequency',
  'TX Frequency',
  'TX Tone',
  'RX Tone',
  'Mode',
  'Bandwidth',
  'Power',
  'Talkaround',
  'Scan List',
  'Notes',
]

export function exportApxCsv(repeaters) {
  const rows = repeaters.map((repeater) => {
    const zoneName = sanitizeApxName(repeater.zone)
    const channelName = sanitizeApxName(repeater.channelName)

    return {
      Zone: zoneName,
      'Channel Name': channelName,
      'RX Frequency': repeater.rxFrequency,
      'TX Frequency': repeater.txFrequency,
      'TX Tone': repeater.tone,
      'RX Tone': repeater.rxTone,
      Mode: repeater.mode,
      Bandwidth: repeater.bandwidth,
      Power: repeater.power,
      Talkaround: repeater.talkaround,
      'Scan List': repeater.scanList,
      Notes: appendApxNameNotes(
        repeater.notes,
        repeater,
        zoneName,
        channelName,
      ),
    }
  })

  return toCsv(APX_HEADERS, rows)
}
