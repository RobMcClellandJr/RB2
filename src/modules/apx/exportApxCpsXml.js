import { sanitizeApxName } from './apxConstraints.js'
import { repeaterMatchesApxBands } from './apxBands.js'

const PORTABLE_CHANNELS_PER_ZONE = 16

export function exportApxCpsXml(repeaters, options = {}) {
  const enabledBands = options.enabledBands || []
  const radioType = options.radioType === 'portable' ? 'portable' : 'mobile'
  const portableModel =
    options.portableModel === 'apx8000' ? 'apx8000' : 'srx2200'
  const portableTopChannelName =
    options.portableTopChannelName === 'rxFrequency' ? 'rxFrequency' : 'callsign'
  const defaultNetworkId = getP25NetworkIdFromValue(options.defaultNac || '293')
  const expandedChannels = expandApxChannels(repeaters, defaultNetworkId)
  const skippedModeCount = repeaters.length - expandedChannels.sourceCount
  const supportedChannels = expandedChannels.channels.filter((channel) =>
    repeaterMatchesApxBands(channel, enabledBands),
  )
  const skippedBandCount = expandedChannels.channels.length - supportedChannels.length
  const defaultNacCount = supportedChannels.filter((channel) => channel.usedDefaultNac).length
  const personalityBaseName =
    sanitizeApxName(options.personalityName || 'RB2') || 'RB2'
  const systemName =
    sanitizeApxName(options.systemName || 'RB2 Cnv Sys') || 'RB2 Cnv Sys'
  const personalityNames = buildPersonalityNames(
    supportedChannels,
    personalityBaseName,
  )
  const channels = supportedChannels.map((channel, index) => ({
    ...channel,
    position: index + 1,
    personalityName: personalityNames[channel.channelType],
  }))
  const zones = buildZones(channels, radioType)

  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<import_export_doc>',
    '  <Version>2</Version>',
    '  <Language>en</Language>',
    '  <Root ExportedAllFeatures="False" ConverterGenerated="False">',
    renderConventionalPersonalities(
      channels,
      personalityNames,
      radioType,
      portableModel,
      systemName,
    ),
    renderConventionalSystem(
      radioType,
      portableModel,
      hasP25Channels(channels),
      systemName,
    ),
    renderZoneChannelAssignments(
      zones,
      radioType,
      portableModel,
      portableTopChannelName,
    ),
    '  </Root>',
    '</import_export_doc>',
    '',
  ]

  const skippedText =
    skippedModeCount > 0
      ? ` Skipped ${skippedModeCount} mode-incompatible record${skippedModeCount === 1 ? '' : 's'} because no APX FM or P25 channel could be inferred.`
      : ''
  const bandText =
    skippedBandCount > 0
      ? ` Skipped ${skippedBandCount} APX channel${skippedBandCount === 1 ? '' : 's'} outside the selected APX bands.`
      : ''
  const nacText =
    defaultNacCount > 0
      ? ` Used default NAC for ${defaultNacCount} P25 channel${defaultNacCount === 1 ? '' : 's'} without a RepeaterBook NAC/Digital Access value.`
      : ''

  const noChannelsReason =
    expandedChannels.skippedNacCount > 0 && !skippedModeCount && !skippedBandCount
      ? 'all P25 channels were missing valid RepeaterBook NAC/Digital Access values'
      : 'the selection did not include compatible APX channels in the selected bands'

  const message =
    channels.length === 0
      ? `No APX CPS XML was downloaded because ${noChannelsReason}.${skippedText}${bandText}${nacText}`
      : `Created APX CPS XML with ${channels.length} APX channel${channels.length === 1 ? '' : 's'} and no scan list.${skippedText}${bandText}${nacText}`

  return {
    content: lines.join('\r\n'),
    channelCount: channels.length,
    skippedCount: skippedModeCount + skippedBandCount + expandedChannels.skippedNacCount,
    message,
  }
}

function expandApxChannels(repeaters, defaultNetworkId) {
  const channels = []
  let sourceCount = 0
  let skippedNacCount = 0
  let defaultNacCount = 0

  repeaters.forEach((repeater, index) => {
    const sourceModes = getSourceModes(repeater)
    const hasAnalog = hasAnalogFmMode(repeater, sourceModes)
    const hasP25 = hasP25Mode(sourceModes)

    if (hasAnalog || hasP25) sourceCount += 1
    if (hasAnalog) channels.push(toApxChannel(repeater, index, 'analog', hasP25))
    if (hasP25) {
      const networkId = getP25NetworkId(repeater)
      const p25NetworkId = networkId || defaultNetworkId
      if (p25NetworkId) {
        if (!networkId) defaultNacCount += 1
        channels.push(
          toApxChannel(
            repeater,
            index,
            'p25',
            hasAnalog,
            p25NetworkId,
            !networkId,
          ),
        )
      } else {
        skippedNacCount += 1
      }
    }
  })

  return { channels, sourceCount, skippedNacCount, defaultNacCount }
}

function getSourceModes(repeater) {
  return String(
    repeater.source?.Modes || repeater.source?.Mode || repeater.mode || '',
  ).toUpperCase()
}

function hasAnalogFmMode(repeater, sourceModes) {
  if (/(DMR|D-?STAR|NXDN)/.test(sourceModes) && !/\bFM\b/.test(sourceModes)) {
    return false
  }
  return /\bFM\b/.test(sourceModes) || repeater.mode === 'FM'
}

function hasP25Mode(sourceModes) {
  return /P-?25|P25/.test(sourceModes)
}

function buildPersonalityNames(channels, personalityBaseName) {
  const hasAnalog = channels.some((channel) => channel.channelType === 'analog')
  const hasP25 = channels.some((channel) => channel.channelType === 'p25')

  if (hasAnalog && hasP25) {
    return {
      analog: sanitizeApxName(`${personalityBaseName} Analog`),
      p25: sanitizeApxName(`${personalityBaseName} P25`),
    }
  }

  return {
    analog: personalityBaseName,
    p25: personalityBaseName,
  }
}

function hasP25Channels(channels) {
  return channels.some((channel) => channel.channelType === 'p25')
}

function toApxChannel(
  repeater,
  index,
  channelType,
  needsSuffix,
  networkId = '',
  usedDefaultNac = false,
) {
  const rxDisplay = formatDisplayFrequency(repeater.rxFrequency)
  const callsign = sanitizeApxName(repeater.callsign || `CH${index + 1}`, 8)
  const frequencyName = sanitizeApxName(`${rxDisplay}-${callsign}`)
  const baseChannelName = sanitizeApxName(`${callsign} ${rxDisplay}`)
  const channelName =
    needsSuffix && channelType === 'p25'
      ? sanitizeApxName(`${baseChannelName.slice(0, 13)}P`)
      : baseChannelName

  return {
    zoneName: sanitizeApxName(repeater.zone || 'RB2'),
    channelName,
    topDisplayCallsign: callsign,
    topDisplayFrequency: topDisplayName(rxDisplay),
    frequencyName: frequencyName || channelName,
    rxFrequency: formatFrequency(repeater.rxFrequency),
    txFrequency: formatFrequency(repeater.txFrequency || repeater.rxFrequency),
    txTone: repeater.tone,
    rxTone: repeater.rxTone || repeater.tone,
    networkId,
    usedDefaultNac,
    channelType,
    spacing: repeater.bandwidth === 'Narrow' ? '2.5 kHz / 12.5 kHz' : '5 kHz / 25 kHz',
    talkaround: repeater.talkaround === 'Yes',
  }
}

function buildZones(channels, radioType) {
  const grouped = new Map()
  const channelsPerZone =
    radioType === 'portable' ? PORTABLE_CHANNELS_PER_ZONE : Infinity

  channels.forEach((channel) => {
    const baseZoneName = channel.zoneName || 'RB2'
    if (!grouped.has(baseZoneName)) grouped.set(baseZoneName, [])
    grouped.get(baseZoneName).push(channel)
  })

  const zones = []
  grouped.forEach((zoneChannels, baseZoneName) => {
    for (let index = 0; index < zoneChannels.length; index += channelsPerZone) {
      const suffix = index === 0 ? '' : ` ${Math.floor(index / channelsPerZone) + 1}`
      zones.push({
        position: zones.length + 1,
        name: sanitizeApxName(`${baseZoneName}${suffix}`),
        channels: zoneChannels.slice(index, index + channelsPerZone),
      })
      const zone = zones[zones.length - 1]
      zone.channels.forEach((channel, channelIndex) => {
        channel.zoneReference = `${zone.position}-${zone.name}`
        channel.zonePosition = channelIndex + 1
      })
    }
  })

  return zones
}

function renderConventionalSystem(
  radioType,
  portableModel,
  hasP25Channel,
  systemName,
) {
  const portable = radioType === 'portable'
  const apx8000 = portable && portableModel === 'apx8000'
  const p25 = hasP25Channel

  return [
    '    <Recset Name="Conventional System" Id="2053">',
    `      <Node Name="Conventional System" ReferenceKey="${xml(systemName)}">`,
    '        <Section Name="General" id="10118">',
    field('System Type', p25 ? 'ASTRO' : portable ? 'MDC' : 'ASTRO'),
    field('Data Profile Selection', '<Data Disabled>'),
    field('Repeater Access Pretime (ms)', '200'),
    field('PTT-ID', 'None'),
    field('Emergency Profile Selection', '<Emergency TX Disabled>'),
    field('Preamble Enable', 'False'),
    field('Conventional System Name', systemName),
    field('System Group Number', '1'),
    field('Individual ID', '1'),
    field('Preamble Length', '80'),
    field('Sidetones', 'None'),
    field('Secondary ID (hex)', '0'),
    field('System Wide Talkgroup Hang Time (sec)', '0.000'),
    field('MDC Ack Pretime (ms)', '900'),
    field('Inter-Packet Time (ms)', '100'),
    field('MDC System Pretime (ms)', '500'),
    field('Preambles', '1'),
    field('Limited Patience (sec)', '53'),
    field('Expanded MDC ID Range', 'False'),
    field('MDC Primary ID (hex)', '1'),
    field('Variable ID (hex)', '0'),
    ...(portable ? [field('Home WACN ID', '0'), field('System ID', '0')] : []),
    '        </Section>',
    '        <Section Name="Quik-Call II" id="10785" Embedded="True">',
    '          <EmbeddedRecset Name="Individual ID Tones" Id="0">',
    renderIndividualIdTone('358.6', '142'),
    renderIndividualIdTone('903.2', '159'),
    renderIndividualIdTone('288.5', '138'),
    renderIndividualIdTone('288.5', '138'),
    '          </EmbeddedRecset>',
    field('Call Format', 'A-B'),
    field('QCII Decode', 'False'),
    '        </Section>',
    ...(portable ? [renderPortableDvrsSection()] : []),
    '        <Section Name="Features" id="10119">',
    field('Select Call / In-Call Reset', 'Auto w/ Carr'),
    field('Data Operated Squelch Enable\\Data Operated Squelch (DOS)', 'True'),
    field('Remote Monitor/Radio Trace\\Remote Radio Mode', 'Disabled'),
    field('Status', 'False'),
    field('Radio Check', 'False'),
    field('Radio Inhibit', 'False'),
    field('Auto Reset Time (sec)', '5'),
    field('Data Operated Squelch Enable\\DOS Operation', '1200/1800 Hz'),
    field('Emergency Alarm Rx Indicator', 'True'),
    field('CAI Data Registration', 'True'),
    field('Data Operated Squelch Enable\\DOS Coast Time (ms)', '275'),
    field('Message', 'False'),
    field('Send Location to Peer/on PTT', 'False'),
    field('Status Request', 'False'),
    field('Remote Monitor/Radio Trace\\Tx Base Time (sec)', '10'),
    ...(apx8000 ? [] : [field('Dynamic ID Enable', 'False')]),
    field('Text Messaging Service', 'None'),
    field('POP25 Enable', 'False'),
    ...(portable
      ? [
          field('Group Text Messaging Service', 'Disabled'),
          field('Personnel Accountability List Selection', '<Disabled>'),
        ]
      : []),
    field('Qualify Emergency Alarm Rx', 'False'),
    '        </Section>',
    ...(portable ? [renderPortableSystemSecureSection()] : []),
    '      </Node>',
    '    </Recset>',
  ].join('\r\n')
}

function renderConventionalPersonalities(
  channels,
  personalityNames,
  radioType,
  portableModel,
  systemName,
) {
  const personalityTypes = ['analog', 'p25'].filter((channelType) =>
    channels.some((channel) => channel.channelType === channelType),
  )

  return [
    '    <Recset Name="Conventional Personality" Id="2059">',
    ...personalityTypes.map((channelType) =>
      renderConventionalPersonality(
        channels.filter((channel) => channel.channelType === channelType),
        personalityNames[channelType],
        radioType,
        portableModel,
        channelType,
        systemName,
      ),
    ),
    '    </Recset>',
  ].join('\r\n')
}

function renderConventionalPersonality(
  channels,
  personalityName,
  radioType,
  portableModel,
  channelType,
  systemName,
) {
  const portable = radioType === 'portable'
  const apx8000 = portable && portableModel === 'apx8000'
  const p25 = channelType === 'p25'

  return [
    `      <Node Name="Conventional Personality" ReferenceKey="${xml(personalityName)}">`,
    '        <Section Name="General" id="10150">',
    field('Conventional Personality Name', personalityName),
    '        </Section>',
    '        <Section Name="Rx Options" id="10136">',
    field('Receive Only Personality', 'False'),
    field('Rx Voice / Signal Type', p25 ? 'ASTRO' : 'Non-ASTRO'),
    field('Busy LED', 'True'),
    field('Rx Unmute Delay (ms)', '0'),
    field('Unmute / Mute Type', 'UnMute, Or Mute'),
    field('Rx De-Emphasis', 'True'),
    field('Squelch (Fine Tune)', '6'),
    field('HearClear', 'Disabled'),
    field('Concurrent Rx Enable', 'True'),
    '        </Section>',
    '        <Section Name="Tx Options" id="10137">',
    field('Tx Voice / Signal Type', p25 ? 'ASTRO' : 'Non-ASTRO'),
    field('Transmit Power Level', 'High'),
    field('Reverse Burst / Turn-Off Code', 'True'),
    field('Adaptive Power', 'False'),
    field('Talk Permit Tone ', 'False'),
    field('Time Out Timer (sec)', '300'),
    field('Transmit Pre-Emphasis', 'True'),
    '        </Section>',
    '        <Section Name="Frequency Options" id="10148" Embedded="True">',
    '          <EmbeddedRecset Name="Frequency Options" Id="0">',
    ...channels.map(renderFrequencyOption),
    '          </EmbeddedRecset>',
    '        </Section>',
    '        <Section Name="Signaling" id="10144">',
    field('Non-ASTRO\\Signaling Type', 'None'),
    field('Non-ASTRO\\System Number', systemName),
    field('ASTRO\\Digital Modulator Type', 'C4FM'),
    field('Emergency Revert\\Revert Type', 'Selected Channel'),
    field('ASTRO\\ASTRO System', p25 ? systemName : '<None>'),
    field('ASTRO\\Late Entry Fast Unmute', 'False'),
    field('Tone Signaling List', '<Tone Signaling Disabled>'),
    field('Non-ASTRO\\PTT ID', 'False'),
    field('Emergency Revert\\Revert Zone', '<None>'),
    field('Non-ASTRO\\Emergency PTT ID', 'False'),
    field('ASTRO\\ASTRO Rx Unmute Rule', 'Normal Squelch'),
    field('Emergency Revert\\Revert Channel', '<None>'),
    ...(portable
      ? [
          field('Revert Talkgroup\\Revert Talkgroup', '1'),
          field('Revert Talkgroup\\Revert TG Secure / Clear Strapping', 'Clear'),
          field('Revert Talkgroup\\Revert TG Key Select', 'CIRC AES'),
        ]
      : []),
    '        </Section>',
    '        <Section Name="Non-ASTRO Call" id="10143">',
    field('Call Alert\\Call Alert Rx / Tx', 'Disabled'),
    field('Selective Call\\Selective Call Rx / Tx', 'Disabled'),
    field('MDC\\Auto Select Call Transmit', 'False'),
    field('Call Alert\\In-Call User Alert Enable', 'False'),
    field('Selective Call\\Unmute Type', 'And'),
    ...(apx8000 ? [] : [field('MDC\\Unlimited Calling', 'False')]),
    field('MDC\\RTT Button Access', 'None'),
    field('Non-ASTRO Call Hot List', 'LIST 1'),
    '        </Section>',
    '        <Section Name="ASTRO Call" id="10141">',
    field('Call Alert\\Call Alert Rx / Tx', 'Disabled'),
    field('Selective Call\\Selective Call Rx / Tx', 'Disabled'),
    ...(portable
      ? [
          field('Tactical Inhibit\\Kill Operation', 'Disabled'),
          ...(apx8000
            ? []
            : [field('Tactical Inhibit\\Stun Operation', 'Disabled')]),
        ]
      : []),
    field('ASTRO Call Hot List', 'LIST 1'),
    field('Selective Call\\Auto Selective Call Transmit', 'False'),
    field('Call Alert\\In-Call User Alert Enable', 'False'),
    ...(apx8000 ? [] : [field('ASTRO Unlimited Calling', 'False')]),
    '        </Section>',
    '        <Section Name="ASTRO Talkgroup" id="10147">',
    field('Talkgroup', 'False'),
    field('Talkgroup List', 'List 1'),
    field('Selection Type', 'Strapped'),
    '        </Section>',
    '        <Section Name="RAC" id="10138">',
    field('Repeater Access', 'False'),
    field('Repeater Access Button 1/ PTT\\Code Type', 'MDC'),
    field('Access Type', 'Manual'),
    field('Repeater Access Button 2\\Code Type', 'None'),
    field('Singletone List Selection', '<Tone Signaling Disabled>'),
    field('Repeater Access Button 1/ PTT\\MDC Repeater ID', '1'),
    field('Repeater Access Button 1/ PTT\\Singletone Alias Selection', '<Disabled>'),
    field('Repeater Access Button 2\\Singletone Alias Selection', '<Disabled>'),
    field('Repeater Access Button 2\\MDC Repeater ID', '1'),
    '        </Section>',
    '        <Section Name="Features" id="10135">',
    field('Smart PTT\\Smart PTT Type', 'Disabled'),
    ...(portable ? [field('Polite DVRS Inbound PTT Request', 'False')] : []),
    field('Scan\\Scan List Selection', '<None>'),
    field('Tactical Rekey Enable', 'False'),
    field('Scan\\Automatic Scan', 'False'),
    ...(apx8000 ? [] : [field('Hot Keypad', 'False')]),
    field('Smart PTT\\Quick Key Override', 'False'),
    ...(portable && !apx8000
      ? [field('OTACR / OTACS Messaging', 'False')]
      : []),
    field('Scan\\Mixed Vote Scan Enable', 'False'),
    field('Scan\\Mixed Vote Scan Tx Steering', 'False'),
    field('Tactical Public Safety UI Enable', 'False'),
    field('End Tx on Voice Absence', 'False'),
    field('Incident Signaling Type', 'Disabled'),
    ...(portable
      ? [
          field('Personnel Accountability\\Personnel Accountability Registration', 'False'),
          field('Personnel Accountability\\Tx Voice Type', 'Digital'),
        ]
      : []),
    field('RF Modem', 'Disabled'),
    ...(portable ? [field('OTA Radio Alias Type', 'Disabled')] : []),
    field('Conventional RSSI Display', 'False'),
    field('RSSI Display Timer (sec)', '15'),
    ...(portable ? [field('OTA Radio Alias Update Enable', 'False')] : []),
    field('DTMF Mic Enable', 'False'),
    '        </Section>',
    '        <Section Name="Phone" id="10139">',
    field('Phone Operation', 'None'),
    field('DTMF Timing Select', 'Timing 1'),
    field('Auto Access Code Select', 'Code 1'),
    '        </Section>',
    '        <Section Name="One Touch" id="10145" Embedded="True">',
    '          <EmbeddedRecset Name="Conventional One Touch" Id="0">',
    renderOneTouchButton(1, radioType),
    renderOneTouchButton(2, radioType),
    renderOneTouchButton(3, radioType),
    renderOneTouchButton(4, radioType),
    '          </EmbeddedRecset>',
    '        </Section>',
    '        <Section Name="Secure" id="10142">',
    field('Secure Voice / Signal Type', p25 ? 'ASTRO' : 'Securenet'),
    field('Packet Data\\Secure / Clear Strapping', 'Clear'),
    field('OTAR Tx', 'True'),
    field('Key ID', 'None'),
    field('Voice\\Ignore Rx Clear Voice', 'False'),
    field('Voice\\Secure / Clear Strapping', 'Clear'),
    field('XL Transmit', 'True'),
    field('Proper Code Detect', 'True'),
    field('Scan Holdoff Strapping', 'Both'),
    field('Voice\\Key Strapping', 'Select'),
    field('Scan Select', 'Non-XL & XL'),
    field('ASTRO OTAR Profile Index', '<Disabled>'),
    field('DES-XL Tx Default', 'False'),
    field('Voice\\Key Select', 'Sec Key 1'),
    field('Packet Data\\Key Select', 'Sec Key 1'),
    field('Echo Mute Time (ms)', '0'),
    field('Packet Data\\Ignore Rx Clear Packet Data', 'False'),
    field('XL Delay Following Key ID', '50'),
    '        </Section>',
    '        <Section Name="Advanced" id="10140">',
    ...(portable ? [] : [field('Analog Flat Audio', 'False')]),
    field('Advanced RF AGC', 'Disabled'),
    ...(portable ? [] : [field('Disable High Pass Filter', 'False')]),
    '        </Section>',
    '      </Node>',
  ].join('\r\n')
}

function renderPortableDvrsSection() {
  return [
    '        <Section Name="DVRS" id="10643">',
    field('Emergency Blocked in Failsoft', 'False'),
    field('Talk Permit Tone', 'True'),
    field('Dynamic Regrouping\\Dynamic Regrouping Enable', 'False'),
    field('Dynamic Regrouping\\Zone', '<None>'),
    field('Dynamic Regrouping\\Channel', '<None>'),
    field('TA After DVRS No Communication Attempts', 'Disabled'),
    field('Out of DVRS Range Time (sec)', 'Disabled'),
    field('Fast Retry Time (ms)', '750'),
    field('Attachment Retries', '4'),
    field('Timers\\Individual Call Max Target Ring Time (sec)', '61'),
    field('Timers\\Private Call Max Initial Ring (sec)', '30'),
    field('Timers\\Force Unmute Time (ms)', 'Immediate'),
    field('Timers\\PTT Warning Time (ms)', '750'),
    field('Timers\\Busy Update Time (sec)', '30'),
    field('Timers\\Response Pending Time (sec)', '6'),
    field('End Out of Range on Analog Rx', 'False'),
    field('Bypass Quick Key Voice Channel Access', 'False'),
    field('Call Type', 'Enhanced Private Call'),
    field('Phase 2 System Compatibility', 'True'),
    field('Prefer Talkaround in NoComms', 'False'),
    field('DVR Sync NAC Matching', 'False'),
    field('Talkaround Audio Mode', 'Phase 1 FDMA'),
    '        </Section>',
  ].join('\r\n')
}

function renderPortableSystemSecureSection() {
  return [
    '        <Section Name="Secure" id="10644">',
    field('ASTRO OTAR Profile Index', '<Disabled>'),
    field('Patch Key Select', 'CIRC AES'),
    field('Private Call Key Select', 'CIRC AES'),
    field('Interconnect Key Select', 'CIRC AES'),
    field('Dynamic Talkgroup Key Select', 'CIRC AES'),
    field('Failsoft Key Select', 'CIRC AES'),
    '        </Section>',
  ].join('\r\n')
}

function renderIndividualIdTone(frequency, code) {
  return [
    '            <EmbeddedNode Name="Individual ID Tones" ReferenceKey="Individual ID Tones">',
    '              <EmbeddedSection Name="Individual ID Tones" id="10783">',
    field('Freq(Hz)', frequency, 16),
    field('Code', code, 16),
    '              </EmbeddedSection>',
    '            </EmbeddedNode>',
  ].join('\r\n')
}

function renderOneTouchButton(index, radioType = 'mobile') {
  const portable = radioType === 'portable'

  return [
    `            <EmbeddedNode Name="Conventional One Touch" ReferenceKey="Button ${index}">`,
    '              <EmbeddedSection Name="Conventional One Touch" id="10146">',
    field('Feature', 'Disabled', 16),
    field('Index', String(index), 16),
    ...(portable
      ? []
      : [field('Abbreviated One Touch Alias', String(index), 16)]),
    '              </EmbeddedSection>',
    '            </EmbeddedNode>',
  ].join('\r\n')
}

function renderFrequencyOption(channel) {
  const txTone = toneFields('Tx', channel.txTone)
  const rxTone = toneFields('Rx / TA', channel.rxTone)
  const networkId = channel.networkId || '659'

  return [
    `            <EmbeddedNode Name="Frequency Options" ReferenceKey="${xml(channel.frequencyName)}">`,
    '              <EmbeddedSection Name="Frequency Options" id="10149">',
    field('Rx / TA Frequency (MHz)', channel.rxFrequency, 16),
    field('User Selectable PL (MPL)', 'False', 16),
    field('Tx Squelch Type', txTone.type, 16),
    field('Tx DPL Code', txTone.dplCode, 16),
    field('Tx DPL Invert', 'False', 16),
    field('Rx / TA Squelch Type', rxTone.type, 16),
    field('Tx Frequency (MHz)', channel.txFrequency, 16),
    field('Tx Network ID', networkId, 16),
    field('Tx PL Code', txTone.plCode, 16),
    field('Tx PL Freq', txTone.plFreq, 16),
    field('Rx / TA  PL Code', rxTone.plCode, 16),
    field('Rx / TA PL Freq', rxTone.plFreq, 16),
    field('Rx / TA DPL Code', rxTone.dplCode, 16),
    field('Rx / TA DPL Invert', 'False', 16),
    field('Rx / TA  Network ID', networkId, 16),
    field('Direct / Talkaround', channel.talkaround ? 'True' : 'False', 16),
    field('Direct Squelch Type', 'Disabled', 16),
    field('Direct PL Freq', '67.0', 16),
    field('Direct PL Code', 'XZ', 16),
    field('ASTRO Talkgroup ID', 'Talkgroup 1', 16),
    field('Tx Deviation / Channel Spacing', channel.spacing, 16),
    field('Name', channel.frequencyName, 16),
    field('Direct Network ID', networkId, 16),
    field('User Selectable PL [MPL]', 'Disabled', 16),
    field('Direct Frequency (MHz)', channel.rxFrequency, 16),
    field('Direct DPL Code', '023', 16),
    field('Direct DPL Invert', 'False', 16),
    field('Mixed Vote Scan Persistent Member', 'False', 16),
    '              </EmbeddedSection>',
    '            </EmbeddedNode>',
  ].join('\r\n')
}

function renderZoneChannelAssignments(
  zones,
  radioType,
  portableModel,
  portableTopChannelName,
) {
  const zoneXml = zones.map((zone) => {
    const zoneReference = `${zone.position}-${zone.name}`
    const portable = radioType === 'portable'
    const apx8000 = portable && portableModel === 'apx8000'

    return [
      `      <Node Name="Zone Channel Assignment" ReferenceKey="${xml(zoneReference)}">`,
      '        <Section Name="Zone" id="10116">',
      field('Zone Announcement', '<None>'),
      ...(portable
        ? [field('Voice Control Name / TTS Announcement ', '')]
        : []),
      field('Zone Name', zone.name),
      ...(portable ? [field('Top Display Zone', topDisplayName(zone.name))] : []),
      field('Dynamic Zone Enable', 'False'),
      ...(apx8000 ? [field('Clone Enable', 'False')] : []),
      '        </Section>',
      '        <Section Name="FPP/Protection" id="10117">',
      field('Protected Zone', 'False'),
      ...(apx8000 ? [] : [field('FPP Enable', 'False')]),
      '        </Section>',
      '        <Section Name="Channels" id="10114" Embedded="True">',
      '          <EmbeddedRecset Name="Channel Assignment List" Id="0">',
      ...zone.channels.map((channel, index) =>
        renderZoneChannel(
          channel,
          index + 1,
          radioType,
          portableModel,
          portableTopChannelName,
        ),
      ),
      '          </EmbeddedRecset>',
      '        </Section>',
      '      </Node>',
    ].join('\r\n')
  })

  return [
    '    <Recset Name="Zone Channel Assignment" Id="2051">',
    ...zoneXml,
    '    </Recset>',
  ].join('\r\n')
}

function renderZoneChannel(
  channel,
  position,
  radioType,
  portableModel,
  portableTopChannelName,
) {
  const portable = radioType === 'portable'
  const apx8000 = portable && portableModel === 'apx8000'

  return [
    `            <EmbeddedNode Name="Channel Assignment List" ReferenceKey="${xml(`${position}-${channel.channelName}`)}">`,
    '              <EmbeddedSection Name="Channel Assignment List" id="10115">',
    field('Channel Type', 'Cnv', 16),
    field('Personality', channel.personalityName, 16),
    field('Channel Announcement', '<None>', 16),
    field('Radio Profile Selection', '<Last Selected>', 16),
    field('Conventional Frequency Option', channel.frequencyName, 16),
    field('Channel Name', channel.channelName, 16),
    ...(portable
      ? [
          field(
            'Top Display Channel',
            getPortableTopDisplayChannel(channel, portableTopChannelName),
            16,
          ),
        ]
      : []),
    field('Trunking Talkgroup', '', 16),
    field('Active Channel', 'True', 16),
    field(
      portable
        ? 'Channel Color Backlight Selection'
        : 'Channel Color Backlight Selection ',
      portable ? 'White' : 'Default',
      16,
    ),
    ...(portable
      ? [
          field(
            'Voice Control Name / TTS Announcement',
            '',
            16,
          ),
        ]
      : []),
    field('Fallback Zone', '<Disabled>', 16),
    field('Fallback Channel', '<Disabled>', 16),
    ...(apx8000 ? [field('Wi-Fi ', 'None', 16)] : []),
    ...(portable
      ? [field('Personnel Accountability Sector ID (hex)', '00', 16)]
      : []),
    '              </EmbeddedSection>',
    '            </EmbeddedNode>',
  ].join('\r\n')
}

function topDisplayName(value) {
  return sanitizeApxName(value, 8)
}

function getPortableTopDisplayChannel(channel, portableTopChannelName) {
  if (portableTopChannelName === 'rxFrequency') {
    return channel.topDisplayFrequency || topDisplayName(channel.rxFrequency)
  }

  return channel.topDisplayCallsign || topDisplayName(channel.channelName)
}

function toneFields(prefix, tone) {
  const cleanTone = String(tone || '').trim().toUpperCase()
  if (!cleanTone) {
    return {
      type: prefix === 'Tx' ? 'Disabled' : 'CSQ',
      plFreq: prefix === 'Tx' ? '67.0' : '67.0',
      plCode: 'XZ',
      dplCode: '023',
    }
  }

  if (/^D\d{3}[NI]?$/.test(cleanTone)) {
    return {
      type: 'DPL',
      plFreq: '67.0',
      plCode: 'XZ',
      dplCode: cleanTone.slice(1, 4),
    }
  }

  return {
    type: 'PL',
    plFreq: cleanTone,
    plCode: PL_CODE_BY_FREQUENCY[cleanTone] || 'XZ',
    dplCode: '023',
  }
}

function getP25NetworkId(repeater) {
  const rawValue = String(
    repeater.digitalAccess ||
      readSourceField(repeater.source, [
        'Digital Access',
        'NAC',
        'P25 NAC',
        'Network ID',
      ]) ||
      '',
  )
    .trim()
    .toUpperCase()

  return getP25NetworkIdFromValue(rawValue)
}

function getP25NetworkIdFromValue(value) {
  const rawValue = String(value || '').trim().toUpperCase()

  if (!rawValue) return ''

  const cleanValue = rawValue.replace(/^NAC\s*/i, '').replace(/[^0-9A-F]/g, '')
  if (!cleanValue) return ''

  const hexValue = Number.parseInt(cleanValue, 16)
  if (Number.isFinite(hexValue) && hexValue >= 0 && hexValue <= 0xfff) {
    return String(hexValue)
  }

  const decimalValue = Number.parseInt(cleanValue, 10)
  if (Number.isFinite(decimalValue) && decimalValue >= 0 && decimalValue <= 4095) {
    return String(decimalValue)
  }

  return ''
}

function readSourceField(source, aliases) {
  if (!source) return ''

  const normalizedMap = Object.entries(source).reduce((map, [key, value]) => {
    map[normalizeKey(key)] = value
    return map
  }, {})

  for (const alias of aliases) {
    const value = normalizedMap[normalizeKey(alias)]
    if (value) return String(value).trim()
  }

  return ''
}

function normalizeKey(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]/g, '')
}

const PL_CODE_BY_FREQUENCY = {
  '67.0': 'XZ',
  '69.3': 'WZ',
  '71.9': 'XA',
  '74.4': 'WA',
  '77.0': 'XB',
  '79.7': 'WB',
  '82.5': 'YZ',
  '85.4': 'YA',
  '88.5': 'YB',
  '91.5': 'ZZ',
  '94.8': 'ZA',
  '97.4': 'ZB',
  '100.0': '1Z',
  '103.5': '1A',
  '107.2': '1B',
  '110.9': '2Z',
  '114.8': '2A',
  '118.8': '2B',
  '123.0': '3Z',
  '127.3': '3A',
  '131.8': '3B',
  '136.5': '4Z',
  '141.3': '4A',
  '146.2': '4B',
  '151.4': '5Z',
  '156.7': '5A',
  '162.2': '5B',
  '167.9': '6Z',
  '173.8': '6A',
  '179.9': '6B',
  '186.2': '7Z',
  '192.8': '7A',
  '203.5': 'M1',
  '206.5': '8Z',
  '210.7': 'M2',
  '218.1': 'M3',
  '225.7': 'M4',
  '229.1': '9Z',
  '233.6': 'M5',
  '241.8': 'M6',
  '250.3': 'M7',
  '254.1': '0Z',
}

function formatFrequency(value) {
  const frequency = Number(value)
  if (!frequency) return '0.000000'
  return frequency.toFixed(6)
}

function formatDisplayFrequency(value) {
  const frequency = Number(value)
  if (!frequency) return '0.000'
  return frequency.toFixed(3)
}

function field(name, value, indent = 10) {
  return `${' '.repeat(indent)}<Field Name="${xml(name)}">${xml(value)}</Field>`
}

function xml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}
