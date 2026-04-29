import { useMemo, useState } from 'react'
import { parseCsv } from './core/csvUtils'
import { normalizeRepeater } from './core/normalizeRepeater'
import { exportApxCsv } from './modules/apx/exportApxCsv'
import { exportApxCpsXml } from './modules/apx/exportApxCpsXml'
import { exportGenericCsv } from './modules/generic/exportGenericCsv'
import ImportPanel from './components/ImportPanel'
import RepeaterTable from './components/RepeaterTable'
import ZoneBuilder from './components/ZoneBuilder'
import ExportPanel from './components/ExportPanel'
import rb2Logo from './assets/rb2-logo.png'
import './styles.css'

const DEFAULT_ZONE = 'Unassigned'
const ZONE_NAME_MAX_LENGTH = 14

function downloadCsv(filename, csvText) {
  const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function App() {
  const [repeaters, setRepeaters] = useState([])
  const [fileName, setFileName] = useState('')
  const [message, setMessage] = useState('Import a RepeaterBook CSV to begin.')
  const [exportModule, setExportModule] = useState('apx')
  const [apxOptions, setApxOptions] = useState({
    personalityName: 'RB2',
    systemName: 'RB2 Cnv Sys',
    radioType: 'mobile',
    portableModel: 'srx2200',
    portableTopChannelName: 'callsign',
    enabledBands: [],
  })

  const selectedRepeaters = useMemo(
    () => repeaters.filter((repeater) => repeater.selected),
    [repeaters],
  )

  const zones = useMemo(() => {
    const zoneSet = new Set(
      repeaters.map((repeater) => repeater.zone).filter(Boolean),
    )
    return [...zoneSet].sort((a, b) => a.localeCompare(b))
  }, [repeaters])

  const zoneSummaries = useMemo(() => {
    const summaries = new Map()

    repeaters.forEach((repeater) => {
      const zone = repeater.zone || DEFAULT_ZONE
      const current = summaries.get(zone) || { name: zone, total: 0, selected: 0 }
      current.total += 1
      if (repeater.selected) current.selected += 1
      summaries.set(zone, current)
    })

    return [...summaries.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [repeaters])

  function handleFileLoaded(text, incomingFileName) {
    try {
      const rows = parseCsv(text)
      const normalized = rows.map((row, index) =>
        normalizeRepeater(row, {
          fallbackId: `repeater-${index + 1}`,
          defaultZone: DEFAULT_ZONE,
        }),
      )

      setRepeaters(normalized)
      setFileName(incomingFileName)
      setMessage(`Loaded ${normalized.length} repeater record${normalized.length === 1 ? '' : 's'}.`)
    } catch (error) {
      setRepeaters([])
      setFileName('')
      setMessage(error.message)
    }
  }

  function updateRepeater(id, updates) {
    setRepeaters((current) =>
      current.map((repeater) =>
        repeater.id === id ? { ...repeater, ...updates } : repeater,
      ),
    )
  }

  function setAllSelected(selected) {
    setRepeaters((current) =>
      current.map((repeater) => ({ ...repeater, selected })),
    )
  }

  function assignSelectedToZone(zoneName) {
    const cleanZone = zoneName.trim()
    if (!cleanZone) return

    setRepeaters((current) =>
      current.map((repeater) =>
        repeater.selected ? { ...repeater, zone: cleanZone } : repeater,
      ),
    )
  }

  function autoAssignSelectedZones(strategy) {
    setRepeaters((current) =>
      current.map((repeater) =>
        repeater.selected
          ? { ...repeater, zone: buildZoneName(repeater, strategy) }
          : repeater,
      ),
    )
  }

  function clearSelectedZones() {
    setRepeaters((current) =>
      current.map((repeater) =>
        repeater.selected ? { ...repeater, zone: DEFAULT_ZONE } : repeater,
      ),
    )
  }

  function handleExport(type) {
    if (selectedRepeaters.length === 0) {
      setMessage('Select at least one repeater before exporting.')
      return
    }

    const baseName = fileName.replace(/\.[^.]+$/, '') || 'rb2-repeaters'
    const timestamp = new Date().toISOString().slice(0, 10)

    if (type === 'apx') {
      downloadCsv(`${baseName}-apx-${timestamp}.csv`, exportApxCsv(selectedRepeaters))
      setMessage('Created APX review CSV. Use APX CPS XML for CPS import/export workflows.')
      return
    }

    if (type === 'apxXml') {
      const xmlExport = exportApxCpsXml(selectedRepeaters, apxOptions)
      if (xmlExport.channelCount === 0) {
        setMessage(xmlExport.message)
        return
      }
      downloadCsv(`${baseName}-apx-cps-${timestamp}.xml`, xmlExport.content)
      setMessage(xmlExport.message)
      return
    }

    downloadCsv(
      `${baseName}-generic-${timestamp}.csv`,
      exportGenericCsv(selectedRepeaters),
    )
  }

  return (
    <main className="app-shell">
      <header className="masthead">
        <div className="masthead-inner">
          <img
            className="brand-logo"
            src={rb2Logo}
            alt="RB2 Amateur Radio Codeplug Imports"
          />
          <div className="masthead-copy">
            <h1>RepeaterBook CSV to radio import files</h1>
            <p className="lede">
              Review repeaters, build zones, and export APX CPS XML or CSV
              files for CPS review. Browser-only: no native codeplug editing,
              no radio connection.
            </p>
          </div>
        </div>
      </header>

      <section className="workspace" aria-label="RB2 repeater workflow">
        <ImportPanel onFileLoaded={handleFileLoaded} message={message} />

        <div className="status-strip" aria-live="polite">
          <span>{repeaters.length} repeaters loaded</span>
          <span>{selectedRepeaters.length} selected</span>
          <span>{zones.length} zones</span>
        </div>

        <ZoneBuilder
          selectedCount={selectedRepeaters.length}
          zones={zones}
          zoneSummaries={zoneSummaries}
          onAssignZone={assignSelectedToZone}
          onAutoAssignZones={autoAssignSelectedZones}
          onClearZones={clearSelectedZones}
        />

        <RepeaterTable
          repeaters={repeaters}
          onUpdateRepeater={updateRepeater}
          onSelectAll={setAllSelected}
        />

        <ExportPanel
          selectedCount={selectedRepeaters.length}
          exportModule={exportModule}
          onExportModuleChange={setExportModule}
          apxOptions={apxOptions}
          onApxOptionsChange={setApxOptions}
          onExport={handleExport}
        />
      </section>
    </main>
  )
}

function buildZoneName(repeater, strategy) {
  const source = repeater.source || {}
  const zoneByStrategy = {
    county: source.County || source.county || 'County',
    state: source.State || source.state || 'State',
    band: getBandZoneName(repeater.rxFrequency),
    mode: repeater.mode || 'Mode',
  }

  return truncateZoneName(zoneByStrategy[strategy] || DEFAULT_ZONE)
}

function getBandZoneName(frequencyMhz) {
  const frequency = Number(frequencyMhz)
  if (frequency >= 144 && frequency <= 148) return '2m'
  if (frequency >= 222 && frequency <= 225) return '1.25m'
  if (frequency >= 420 && frequency <= 450) return '70cm'
  if (frequency >= 902 && frequency <= 928) return '33cm'
  if (frequency >= 1240 && frequency <= 1300) return '23cm'
  return 'Other'
}

function truncateZoneName(value) {
  return String(value || DEFAULT_ZONE).trim().slice(0, ZONE_NAME_MAX_LENGTH) || DEFAULT_ZONE
}

export default App
