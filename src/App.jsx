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
import './styles.css'

const DEFAULT_ZONE = 'Unassigned'

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
  const [message, setMessage] = useState('Upload a RepeaterBook-style CSV to begin.')

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
      const xmlExport = exportApxCpsXml(selectedRepeaters)
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
        <div>
          <p className="eyebrow">RB2</p>
          <h1>Repeater CSV prep for amateur radio programming</h1>
          <p className="lede">
            Browser-only tools for turning RepeaterBook-style data into
            user-reviewable CSV exports. RB2 does not create Motorola codeplugs
            or communicate with radios.
          </p>
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
          onAssignZone={assignSelectedToZone}
        />

        <RepeaterTable
          repeaters={repeaters}
          onUpdateRepeater={updateRepeater}
          onSelectAll={setAllSelected}
        />

        <ExportPanel
          selectedCount={selectedRepeaters.length}
          onExport={handleExport}
        />
      </section>
    </main>
  )
}

export default App
