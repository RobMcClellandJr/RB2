import { sanitizeApxName } from './apxConstraints.js'

const MAX_CHANNELS_PER_ZONE = 16

export function exportApxCpsXml(repeaters, options = {}) {
  const supported = repeaters.filter((repeater) => repeater.mode === 'FM')
  const skipped = repeaters.length - supported.length
  const channels = supported.map(toApxChannel)
  const zones = buildZones(channels)
  const scanLists = zones.map((zone, index) => ({
    alias: sanitizeApxName(`RB2 Scan ${index + 1}`),
    members: zone.channels,
  }))

  if (options.templateXml) {
    return exportApxCpsXmlFromTemplate({
      templateXml: options.templateXml,
      channels,
      zones,
      scanLists,
      skipped,
    })
  }

  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<import_export_doc>',
    '  <Version>2</Version>',
    '  <Language>en</Language>',
    '  <Root ExportedAllFeatures="False" ConverterGenerated="False">',
    renderConventionalPersonality(channels, scanLists[0]?.alias || 'RB2 Scan 1'),
    renderConventionalSystem(),
    renderScanLists(scanLists),
    renderZoneChannelAssignments(zones),
    '  </Root>',
    '</import_export_doc>',
    '',
  ]

  const skippedText =
    skipped > 0
      ? ` Skipped ${skipped} non-FM record${skipped === 1 ? '' : 's'} because APX conventional import is analog FM/P25 oriented and RB2 cannot convert DMR, D-STAR, or Fusion protocols.`
      : ''

  const message =
    channels.length === 0
      ? `No APX CPS XML was downloaded because the selection did not include FM conventional repeaters.${skippedText}`
      : `Created APX CPS XML with ${channels.length} FM conventional channel${channels.length === 1 ? '' : 's'}.${skippedText}`

  return {
    content: lines.join('\r\n'),
    channelCount: channels.length,
    skippedCount: skipped,
    message,
  }
}

function exportApxCpsXmlFromTemplate({ templateXml, channels, zones, scanLists, skipped }) {
  const parser = new DOMParser()
  const templateDoc = parser.parseFromString(templateXml, 'application/xml')

  if (templateDoc.querySelector('parsererror')) {
    return fallbackTemplateError(channels, skipped, 'The APX template XML could not be parsed.')
  }

  const sourceRoot = templateDoc.querySelector('Root')
  const personalityTemplate =
    findNode(templateDoc, 'Conventional Personality', 'HAM MAIN') ||
    firstNode(templateDoc, 'Conventional Personality')
  const systemTemplate =
    findNode(templateDoc, 'Conventional System', 'Cnv Sys 3') ||
    firstNode(templateDoc, 'Conventional System')
  const scanTemplate = firstNode(templateDoc, 'Scan List')
  const zoneTemplate = firstNode(templateDoc, 'Zone Channel Assignment')

  if (!sourceRoot || !personalityTemplate || !systemTemplate || !scanTemplate || !zoneTemplate) {
    return fallbackTemplateError(
      channels,
      skipped,
      'The APX template XML is missing a conventional personality, system, scan list, or zone assignment template.',
    )
  }

  const outputDoc = document.implementation.createDocument('', 'import_export_doc')
  const rootElement = outputDoc.documentElement
  appendTextElement(outputDoc, rootElement, 'Version', '2')
  appendTextElement(outputDoc, rootElement, 'Language', 'en')

  const outputRoot = outputDoc.createElement('Root')
  outputRoot.setAttribute('ExportedAllFeatures', sourceRoot.getAttribute('ExportedAllFeatures') || 'False')
  outputRoot.setAttribute('ConverterGenerated', 'False')
  rootElement.appendChild(outputRoot)

  outputRoot.appendChild(
    buildTemplateRecset(outputDoc, 'Conventional Personality', '2059', [
      buildTemplatePersonality(outputDoc, personalityTemplate, channels, scanLists[0]?.alias || 'RB2 Scan 1'),
    ]),
  )
  outputRoot.appendChild(
    buildTemplateRecset(outputDoc, 'Conventional System', '2053', [
      buildTemplateSystem(outputDoc, systemTemplate),
    ]),
  )
  outputRoot.appendChild(
    buildTemplateRecset(
      outputDoc,
      'Scan List',
      '2057',
      scanLists.map((scanList, index) =>
        buildTemplateScanList(outputDoc, scanTemplate, scanList, index + 1),
      ),
    ),
  )
  outputRoot.appendChild(
    buildTemplateRecset(
      outputDoc,
      'Zone Channel Assignment',
      '2051',
      zones.map((zone) => buildTemplateZone(outputDoc, zoneTemplate, zone)),
    ),
  )

  const serializer = new XMLSerializer()
  const content = `${serializer.serializeToString(outputDoc)}\r\n`
  const skippedText =
    skipped > 0
      ? ` Skipped ${skipped} non-FM record${skipped === 1 ? '' : 's'} because RB2 does not convert DMR, D-STAR, or Fusion protocols.`
      : ''

  return {
    content,
    channelCount: channels.length,
    skippedCount: skipped,
    message: `Created template-based APX CPS XML with ${channels.length} FM conventional channel${channels.length === 1 ? '' : 's'}.${skippedText}`,
  }
}

function buildTemplateRecset(doc, name, id, nodes) {
  const recset = doc.createElement('Recset')
  recset.setAttribute('Name', name)
  recset.setAttribute('Id', id)
  nodes.forEach((node) => recset.appendChild(node))
  return recset
}

function buildTemplateSystem(doc, templateNode) {
  const node = cloneInto(doc, templateNode)
  node.setAttribute('ReferenceKey', 'RB2 Cnv Sys')
  setXmlField(node, 'Conventional System Name', 'RB2 Cnv Sys')
  return node
}

function buildTemplatePersonality(doc, templateNode, channels, scanListAlias) {
  const node = cloneInto(doc, templateNode)
  node.setAttribute('ReferenceKey', 'RB2 Analog')
  setXmlField(node, 'Conventional Personality Name', 'RB2 Analog')
  setXmlField(node, 'Non-ASTRO\\System Number', 'RB2 Cnv Sys')
  setXmlField(node, 'ASTRO\\ASTRO System', '<None>')
  setXmlField(node, 'Scan\\Scan List Selection', scanListAlias)

  const frequencyRecset = node.querySelector('EmbeddedRecset[Name="Frequency Options"]')
  const frequencyTemplate = frequencyRecset?.querySelector('EmbeddedNode')
  if (frequencyRecset && frequencyTemplate) {
    removeChildren(frequencyRecset)
    channels.forEach((channel) =>
      frequencyRecset.appendChild(buildTemplateFrequencyOption(doc, frequencyTemplate, channel)),
    )
  }

  return node
}

function buildTemplateFrequencyOption(doc, templateNode, channel) {
  const node = cloneInto(doc, templateNode)
  const txTone = toneFields('Tx', channel.txTone)
  const rxTone = toneFields('Rx / TA', channel.rxTone)

  node.setAttribute('ReferenceKey', channel.frequencyName)
  setXmlField(node, 'Rx / TA Frequency (MHz)', channel.rxFrequency)
  setXmlField(node, 'Tx Frequency (MHz)', channel.txFrequency)
  setXmlField(node, 'Tx Squelch Type', txTone.type)
  setXmlField(node, 'Rx / TA Squelch Type', rxTone.type)
  setXmlField(node, 'Tx PL Freq', txTone.plFreq)
  setXmlField(node, 'Rx / TA PL Freq', rxTone.plFreq)
  setXmlField(node, 'Tx DPL Code', txTone.dplCode)
  setXmlField(node, 'Rx / TA DPL Code', rxTone.dplCode)
  setXmlField(node, 'Direct / Talkaround', channel.talkaround ? 'True' : 'False')
  setXmlField(node, 'Tx Deviation / Channel Spacing', channel.spacing)
  setXmlField(node, 'Name', channel.frequencyName)
  return node
}

function buildTemplateScanList(doc, templateNode, scanList, index) {
  const node = cloneInto(doc, templateNode)
  const firstMember = scanMemberReference(scanList.members[0])

  node.setAttribute('ReferenceKey', scanList.alias)
  setXmlField(node, 'Scan List Alias', scanList.alias)
  setXmlField(node, 'Designated Voice Tx Member', firstMember)
  setXmlField(node, 'Designated Data Member', firstMember)

  const memberRecset = node.querySelector('EmbeddedRecset[Name="Scan Member List"]')
  const memberTemplate = memberRecset?.querySelector('EmbeddedNode')
  if (memberRecset && memberTemplate) {
    removeChildren(memberRecset)
    scanList.members.forEach((channel) =>
      memberRecset.appendChild(buildTemplateScanMember(doc, memberTemplate, channel)),
    )
  }

  if (!scanList.alias) node.setAttribute('ReferenceKey', `RB2 Scan ${index}`)
  return node
}

function buildTemplateScanMember(doc, templateNode, channel) {
  const node = cloneInto(doc, templateNode)
  node.setAttribute('ReferenceKey', scanMemberReference(channel))
  setXmlField(node, 'Zone', channel.zoneReference)
  setXmlField(node, 'Channel', `${channel.zonePosition}-${channel.channelName}`)
  return node
}

function buildTemplateZone(doc, templateNode, zone) {
  const node = cloneInto(doc, templateNode)
  const zoneReference = `${zone.position}-${zone.name}`

  node.setAttribute('ReferenceKey', zoneReference)
  setXmlField(node, 'Zone Name', zone.name)
  setXmlField(node, 'FPP Enable', 'False')

  const channelRecset = node.querySelector('EmbeddedRecset[Name="Channel Assignment List"]')
  const channelTemplate = channelRecset?.querySelector('EmbeddedNode')
  if (channelRecset && channelTemplate) {
    removeChildren(channelRecset)
    zone.channels.forEach((channel) =>
      channelRecset.appendChild(buildTemplateZoneChannel(doc, channelTemplate, channel)),
    )
  }

  return node
}

function buildTemplateZoneChannel(doc, templateNode, channel) {
  const node = cloneInto(doc, templateNode)
  node.setAttribute('ReferenceKey', `${channel.zonePosition}-${channel.channelName}`)
  setXmlField(node, 'Channel Type', 'Cnv')
  setXmlField(node, 'Personality', 'RB2 Analog')
  setXmlField(node, 'Conventional Frequency Option', channel.frequencyName)
  setXmlField(node, 'Channel Name', channel.channelName)
  setXmlField(node, 'Active Channel', 'True')
  return node
}

function fallbackTemplateError(channels, skipped, message) {
  return {
    content: '',
    channelCount: 0,
    skippedCount: skipped,
    message: `${message} APX CPS XML was not downloaded. ${channels.length} FM channel${channels.length === 1 ? '' : 's'} were ready for export.`,
  }
}

function findNode(doc, recsetName, referenceKey) {
  return [...doc.querySelectorAll(`Recset[Name="${recsetName}"] > Node`)].find(
    (node) => node.getAttribute('ReferenceKey') === referenceKey,
  )
}

function firstNode(doc, recsetName) {
  return doc.querySelector(`Recset[Name="${recsetName}"] > Node`)
}

function setXmlField(node, name, value) {
  const field = [...node.querySelectorAll('Field')].find(
    (candidate) => candidate.getAttribute('Name') === name,
  )
  if (field) field.textContent = value
}

function cloneInto(doc, node) {
  return doc.importNode(node, true)
}

function removeChildren(node) {
  while (node.firstChild) node.removeChild(node.firstChild)
}

function appendTextElement(doc, parent, name, value) {
  const element = doc.createElement(name)
  element.textContent = value
  parent.appendChild(element)
}

function toApxChannel(repeater, index) {
  const channelName = sanitizeApxName(repeater.channelName || `RB2 ${index + 1}`)
  const frequencyName = sanitizeApxName(
    `${formatFrequency(repeater.rxFrequency)} ${repeater.callsign}`.trim(),
  )

  return {
    position: index + 1,
    zoneName: sanitizeApxName(repeater.zone || 'RB2'),
    channelName,
    frequencyName: frequencyName || channelName,
    rxFrequency: formatFrequency(repeater.rxFrequency),
    txFrequency: formatFrequency(repeater.txFrequency || repeater.rxFrequency),
    txTone: repeater.tone,
    rxTone: repeater.rxTone || repeater.tone,
    spacing: repeater.bandwidth === 'Narrow' ? '2.5 kHz / 12.5 kHz' : '5 kHz / 25 kHz',
    talkaround: repeater.talkaround === 'Yes',
  }
}

function buildZones(channels) {
  const grouped = new Map()

  channels.forEach((channel) => {
    const baseZoneName = channel.zoneName || 'RB2'
    if (!grouped.has(baseZoneName)) grouped.set(baseZoneName, [])
    grouped.get(baseZoneName).push(channel)
  })

  const zones = []
  grouped.forEach((zoneChannels, baseZoneName) => {
    for (let index = 0; index < zoneChannels.length; index += MAX_CHANNELS_PER_ZONE) {
      const suffix = index === 0 ? '' : ` ${Math.floor(index / MAX_CHANNELS_PER_ZONE) + 1}`
      zones.push({
        position: zones.length + 1,
        name: sanitizeApxName(`${baseZoneName}${suffix}`),
        channels: zoneChannels.slice(index, index + MAX_CHANNELS_PER_ZONE),
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

function renderConventionalSystem() {
  return [
    '    <Recset Name="Conventional System" Id="2053">',
    '      <Node Name="Conventional System" ReferenceKey="RB2 Cnv Sys">',
    '        <Section Name="General" id="10118">',
    field('System Type', 'ASTRO'),
    field('Data Profile Selection', '<Data Disabled>'),
    field('Repeater Access Pretime (ms)', '200'),
    field('PTT-ID', 'None'),
    field('Emergency Profile Selection', '<Emergency TX Disabled>'),
    field('Preamble Enable', 'False'),
    field('Conventional System Name', 'RB2 Cnv Sys'),
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
    field('Dynamic ID Enable', 'False'),
    field('Text Messaging Service', 'None'),
    field('POP25 Enable', 'False'),
    field('Qualify Emergency Alarm Rx', 'False'),
    '        </Section>',
    '      </Node>',
    '    </Recset>',
  ].join('\r\n')
}

function renderConventionalPersonality(channels, scanListAlias) {
  return [
    '    <Recset Name="Conventional Personality" Id="2059">',
    '      <Node Name="Conventional Personality" ReferenceKey="RB2 Analog">',
    '        <Section Name="General" id="10150">',
    field('Conventional Personality Name', 'RB2 Analog'),
    '        </Section>',
    '        <Section Name="Rx Options" id="10136">',
    field('Receive Only Personality', 'False'),
    field('Rx Voice / Signal Type', 'Non-ASTRO'),
    field('Busy LED', 'True'),
    field('Rx Unmute Delay (ms)', '0'),
    field('Unmute / Mute Type', 'UnMute, Or Mute'),
    field('Rx De-Emphasis', 'True'),
    field('Squelch (Fine Tune)', '6'),
    field('HearClear', 'Disabled'),
    field('Concurrent Rx Enable', 'True'),
    '        </Section>',
    '        <Section Name="Tx Options" id="10137">',
    field('Tx Voice / Signal Type', 'Non-ASTRO'),
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
    field('Non-ASTRO\\System Number', 'RB2 Cnv Sys'),
    field('ASTRO\\Digital Modulator Type', 'C4FM'),
    field('Emergency Revert\\Revert Type', 'Selected Channel'),
    field('ASTRO\\ASTRO System', '<None>'),
    field('ASTRO\\Late Entry Fast Unmute', 'False'),
    field('Tone Signaling List', '<Tone Signaling Disabled>'),
    field('Non-ASTRO\\PTT ID', 'False'),
    field('Emergency Revert\\Revert Zone', '<None>'),
    field('Non-ASTRO\\Emergency PTT ID', 'False'),
    field('ASTRO\\ASTRO Rx Unmute Rule', 'Normal Squelch'),
    field('Emergency Revert\\Revert Channel', '<None>'),
    '        </Section>',
    '        <Section Name="Non-ASTRO Call" id="10143">',
    field('Call Alert\\Call Alert Rx / Tx', 'Disabled'),
    field('Selective Call\\Selective Call Rx / Tx', 'Disabled'),
    field('MDC\\Auto Select Call Transmit', 'False'),
    field('Call Alert\\In-Call User Alert Enable', 'False'),
    field('Selective Call\\Unmute Type', 'And'),
    field('MDC\\Unlimited Calling', 'False'),
    field('MDC\\RTT Button Access', 'None'),
    field('Non-ASTRO Call Hot List', 'LIST 1'),
    '        </Section>',
    '        <Section Name="ASTRO Call" id="10141">',
    field('Call Alert\\Call Alert Rx / Tx', 'Disabled'),
    field('Selective Call\\Selective Call Rx / Tx', 'Disabled'),
    field('ASTRO Call Hot List', 'LIST 1'),
    field('Selective Call\\Auto Selective Call Transmit', 'False'),
    field('Call Alert\\In-Call User Alert Enable', 'False'),
    field('ASTRO Unlimited Calling', 'False'),
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
    field('Scan\\Scan List Selection', scanListAlias),
    field('Tactical Rekey Enable', 'False'),
    field('Scan\\Automatic Scan', 'False'),
    field('Hot Keypad', 'False'),
    field('Smart PTT\\Quick Key Override', 'False'),
    field('Scan\\Mixed Vote Scan Enable', 'False'),
    field('Scan\\Mixed Vote Scan Tx Steering', 'False'),
    field('Tactical Public Safety UI Enable', 'False'),
    field('End Tx on Voice Absence', 'False'),
    field('Incident Signaling Type', 'Disabled'),
    field('RF Modem', 'Disabled'),
    field('Conventional RSSI Display', 'False'),
    field('RSSI Display Timer (sec)', '15'),
    field('DTMF Mic Enable', 'False'),
    '        </Section>',
    '        <Section Name="Phone" id="10139">',
    field('Phone Operation', 'None'),
    field('DTMF Timing Select', 'Timing 1'),
    field('Auto Access Code Select', 'Code 1'),
    '        </Section>',
    '        <Section Name="One Touch" id="10145" Embedded="True">',
    '          <EmbeddedRecset Name="Conventional One Touch" Id="0">',
    renderOneTouchButton(1),
    renderOneTouchButton(2),
    renderOneTouchButton(3),
    renderOneTouchButton(4),
    '          </EmbeddedRecset>',
    '        </Section>',
    '        <Section Name="Secure" id="10142">',
    field('Secure Voice / Signal Type', 'ASTRO'),
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
    field('Analog Flat Audio', 'False'),
    field('Advanced RF AGC', 'Disabled'),
    field('Disable High Pass Filter', 'False'),
    '        </Section>',
    '      </Node>',
    '    </Recset>',
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

function renderOneTouchButton(index) {
  return [
    `            <EmbeddedNode Name="Conventional One Touch" ReferenceKey="Button ${index}">`,
    '              <EmbeddedSection Name="Conventional One Touch" id="10146">',
    field('Feature', 'Disabled', 16),
    field('Index', String(index), 16),
    field('Abbreviated One Touch Alias', String(index), 16),
    '              </EmbeddedSection>',
    '            </EmbeddedNode>',
  ].join('\r\n')
}

function renderFrequencyOption(channel) {
  const txTone = toneFields('Tx', channel.txTone)
  const rxTone = toneFields('Rx / TA', channel.rxTone)

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
    field('Tx Network ID', '659', 16),
    field('Tx PL Code', txTone.plCode, 16),
    field('Tx PL Freq', txTone.plFreq, 16),
    field('Rx / TA  PL Code', rxTone.plCode, 16),
    field('Rx / TA PL Freq', rxTone.plFreq, 16),
    field('Rx / TA DPL Code', rxTone.dplCode, 16),
    field('Rx / TA DPL Invert', 'False', 16),
    field('Rx / TA  Network ID', '659', 16),
    field('Direct / Talkaround', channel.talkaround ? 'True' : 'False', 16),
    field('Direct Squelch Type', 'Disabled', 16),
    field('Direct PL Freq', '67.0', 16),
    field('Direct PL Code', 'XZ', 16),
    field('ASTRO Talkgroup ID', 'Talkgroup 1', 16),
    field('Tx Deviation / Channel Spacing', channel.spacing, 16),
    field('Name', channel.frequencyName, 16),
    field('Direct Network ID', '659', 16),
    field('User Selectable PL [MPL]', 'Disabled', 16),
    field('Direct Frequency (MHz)', channel.rxFrequency, 16),
    field('Direct DPL Code', '023', 16),
    field('Direct DPL Invert', 'False', 16),
    field('Mixed Vote Scan Persistent Member', 'False', 16),
    '              </EmbeddedSection>',
    '            </EmbeddedNode>',
  ].join('\r\n')
}

function renderScanLists(scanLists) {
  const listXml = scanLists.map((scanList) => {
    const firstMember = scanMemberReference(scanList.members[0], scanList.members[0]?.position || 1)
    return [
      `      <Node Name="Scan List" ReferenceKey="${xml(scanList.alias)}">`,
      '        <Section Name="General" id="10131">',
      field('Scan Type', 'Conventional'),
    field('Designated Data Rx / Tx Type', 'None'),
    field('Designated Voice Tx Member Type', 'Selected Channel'),
    field('Priority Assignment\\Dynamic Priority', 'False'),
    field('Trunking System\\Record', 'Trk Sys 1'),
    field('Priority Assignment\\Priority 1 - Type', 'Disabled'),
      field('Priority Assignment\\Priority 2 - Type', 'Disabled'),
      field('Priority Assignment\\Priority Member 1', '<None>'),
      field('Priority Assignment\\Priority Member 2', '<None>'),
      field('Scan List Alias', scanList.alias),
      field('Non-Priority Members', 'Fixed'),
      field('Designated Voice Tx Member', firstMember),
      field('Designated Data Member', firstMember),
      '        </Section>',
      '        <Section Name="Advanced" id="10130">',
      field('Tx Steering', 'False'),
      field('Display Strongest Voted Channel', 'True'),
      field('Voting Scan Delay Timer', '0'),
      field('Data Tx Limited Patience Timer (ms)', 'Infinite'),
      field('Mixed Conventional Vote Scan Inactivity Timer (min)', '10'),
      '        </Section>',
      '        <Section Name="Scan List Members" id="10132" Embedded="True">',
      '          <EmbeddedRecset Name="Scan Member List" Id="0">',
      ...scanList.members.map((member) => renderScanMember(member)),
      '          </EmbeddedRecset>',
      '        </Section>',
      '      </Node>',
    ].join('\r\n')
  })

  return [
    '    <Recset Name="Scan List" Id="2057">',
    ...listXml,
    '    </Recset>',
  ].join('\r\n')
}

function renderScanMember(channel) {
  const reference = scanMemberReference(channel)
  return [
    `            <EmbeddedNode Name="Scan Member List" ReferenceKey="${xml(reference)}">`,
    '              <EmbeddedSection Name="Scan Member List" id="10133">',
    field('Zone', channel.zoneReference, 16),
    field('Channel', `${channel.zonePosition}-${channel.channelName}`, 16),
    '              </EmbeddedSection>',
    '            </EmbeddedNode>',
  ].join('\r\n')
}

function renderZoneChannelAssignments(zones) {
  const zoneXml = zones.map((zone) => {
    const zoneReference = `${zone.position}-${zone.name}`

    return [
      `      <Node Name="Zone Channel Assignment" ReferenceKey="${xml(zoneReference)}">`,
      '        <Section Name="Zone" id="10116">',
      field('Zone Announcement', '<None>'),
      field('Zone Name', zone.name),
      field('Dynamic Zone Enable', 'False'),
      '        </Section>',
      '        <Section Name="FPP/Protection" id="10117">',
      field('Protected Zone', 'False'),
      field('FPP Enable', 'False'),
      '        </Section>',
      '        <Section Name="Channels" id="10114" Embedded="True">',
      '          <EmbeddedRecset Name="Channel Assignment List" Id="0">',
      ...zone.channels.map((channel, index) => renderZoneChannel(channel, index + 1)),
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

function renderZoneChannel(channel, position) {
  return [
    `            <EmbeddedNode Name="Channel Assignment List" ReferenceKey="${xml(`${position}-${channel.channelName}`)}">`,
    '              <EmbeddedSection Name="Channel Assignment List" id="10115">',
    field('Channel Type', 'Cnv', 16),
    field('Personality', 'RB2 Analog', 16),
    field('Channel Announcement', '<None>', 16),
    field('Radio Profile Selection', '<Last Selected>', 16),
    field('Conventional Frequency Option', channel.frequencyName, 16),
    field('Channel Name', channel.channelName, 16),
    field('Trunking Talkgroup', '', 16),
    field('Active Channel', 'True', 16),
    field('Channel Color Backlight Selection ', 'Default', 16),
    field('Fallback Zone', '<Disabled>', 16),
    field('Fallback Channel', '<Disabled>', 16),
    '              </EmbeddedSection>',
    '            </EmbeddedNode>',
  ].join('\r\n')
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

function scanMemberReference(channel) {
  if (!channel) return ''
  return `${channel.zonePosition}-(${channel.zoneReference || channel.zoneName})(${channel.zonePosition}-${channel.channelName})`
}

function formatFrequency(value) {
  const frequency = Number(value)
  if (!frequency) return '0.000000'
  return frequency.toFixed(6)
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
