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
const WORKFLOW_STEPS = [
  { id: 'import', label: 'Import' },
  { id: 'repeaters', label: 'Repeaters' },
  { id: 'zones', label: 'Zones' },
  { id: 'export', label: 'Export' },
]

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
  const [customZones, setCustomZones] = useState([])
  const [importName, setImportName] = useState('')
  const [message, setMessage] = useState('Import a RepeaterBook CSV to begin.')
  const [activeStep, setActiveStep] = useState('import')
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
    customZones.forEach((zone) => zoneSet.add(zone))
    return [...zoneSet].sort((a, b) => a.localeCompare(b))
  }, [customZones, repeaters])

  const zoneSummaries = useMemo(() => {
    const summaries = new Map()

    repeaters.forEach((repeater) => {
      const zone = repeater.zone || DEFAULT_ZONE
      const current = summaries.get(zone) || { name: zone, total: 0, selected: 0 }
      current.total += 1
      if (repeater.selected) current.selected += 1
      summaries.set(zone, current)
    })

    customZones.forEach((zone) => {
      if (!summaries.has(zone)) {
        summaries.set(zone, { name: zone, total: 0, selected: 0 })
      }
    })

    return [...summaries.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [customZones, repeaters])

  function handleFilesLoaded(files, readError) {
    if (readError) {
      setRepeaters([])
      setCustomZones([])
      setImportName('')
      setMessage(readError.message)
      setActiveStep('import')
      return
    }

    try {
      const normalized = files.flatMap((file, fileIndex) => {
        const rows = parseCsv(file.text)
        return rows.map((row, rowIndex) =>
          normalizeRepeater(row, {
            fallbackId: `file-${fileIndex + 1}-repeater-${rowIndex + 1}`,
            defaultZone: DEFAULT_ZONE,
          }),
        )
      })
      const fileCount = files.length
      const importLabel =
        fileCount === 1 ? files[0].name : `rb2-${fileCount}-csv-files`

      setRepeaters(normalized)
      setCustomZones([])
      setImportName(importLabel)
      setMessage(
        `Loaded ${normalized.length} repeater record${normalized.length === 1 ? '' : 's'} from ${fileCount} CSV file${fileCount === 1 ? '' : 's'}.`,
      )
      if (normalized.length > 0) setActiveStep('repeaters')
    } catch (error) {
      setRepeaters([])
      setCustomZones([])
      setImportName('')
      setMessage(error.message)
      setActiveStep('import')
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

  function autoAssignSelectedZones(strategy) {
    setRepeaters((current) =>
      current.map((repeater) =>
        repeater.selected
          ? { ...repeater, zone: buildZoneName(repeater, strategy) }
          : repeater,
      ),
    )
  }

  function addCustomZone(zoneName) {
    const cleanZone = truncateZoneName(zoneName)
    if (!cleanZone) return

    setCustomZones((current) =>
      current.some((zone) => zone.toLowerCase() === cleanZone.toLowerCase())
        ? current
        : [...current, cleanZone],
    )
  }

  function moveRepeaterToZone(repeaterId, zoneName) {
    const cleanZone = truncateZoneName(zoneName)
    addCustomZone(cleanZone)
    updateRepeater(repeaterId, { zone: cleanZone })
  }

  function renameZone(oldZoneName, newZoneName) {
    const oldZone = truncateZoneName(oldZoneName)
    const newZone = truncateZoneName(newZoneName)
    if (!newZone || oldZone === DEFAULT_ZONE || oldZone === newZone) return

    setCustomZones((current) => {
      const withoutOldZone = current.filter(
        (zone) => zone.toLowerCase() !== oldZone.toLowerCase(),
      )

      return withoutOldZone.some(
        (zone) => zone.toLowerCase() === newZone.toLowerCase(),
      )
        ? withoutOldZone
        : [...withoutOldZone, newZone]
    })
    setRepeaters((current) =>
      current.map((repeater) =>
        repeater.zone === oldZone ? { ...repeater, zone: newZone } : repeater,
      ),
    )
  }

  function deleteZone(zoneName) {
    const cleanZone = truncateZoneName(zoneName)
    if (cleanZone === DEFAULT_ZONE) return

    setCustomZones((current) => current.filter((zone) => zone !== cleanZone))
    setRepeaters((current) =>
      current.map((repeater) =>
        repeater.zone === cleanZone
          ? { ...repeater, zone: DEFAULT_ZONE }
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

    const baseName = importName.replace(/\.[^.]+$/, '') || 'rb2-repeaters'
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

  const activeStepIndex = WORKFLOW_STEPS.findIndex((step) => step.id === activeStep)
  const canLeaveImport = repeaters.length > 0
  const canMoveNext =
    activeStep === 'import' ? canLeaveImport : activeStepIndex < WORKFLOW_STEPS.length - 1
  const previousStep = WORKFLOW_STEPS[activeStepIndex - 1]
  const nextStep = WORKFLOW_STEPS[activeStepIndex + 1]

  function goToStep(stepId) {
    if (stepId !== 'import' && repeaters.length === 0) return
    setActiveStep(stepId)
  }

  function goToPreviousStep() {
    if (previousStep) setActiveStep(previousStep.id)
  }

  function goToNextStep() {
    if (!canMoveNext || !nextStep) return
    setActiveStep(nextStep.id)
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
            <h1>RepeaterBook CSV to Radio Codeplug Import Files</h1>
            <p className="lede">
              Import repeaters, build zones, and export to an importable file
              compatible with your radio's programming software.
            </p>
          </div>
        </div>
      </header>

      <section className="workspace" aria-label="RB2 repeater workflow">
        <nav className="workflow-nav" aria-label="Workflow steps">
          {WORKFLOW_STEPS.map((step, index) => {
            const isActive = step.id === activeStep
            const isAvailable = step.id === 'import' || repeaters.length > 0

            return (
              <button
                key={step.id}
                className={isActive ? 'step-tab active' : 'step-tab'}
                type="button"
                disabled={!isAvailable}
                onClick={() => goToStep(step.id)}
              >
                <span>{index + 1}</span>
                {step.label}
              </button>
            )
          })}
        </nav>

        <div className="status-strip" aria-live="polite">
          <span>{repeaters.length} repeaters loaded</span>
          <span>{selectedRepeaters.length} selected</span>
          <span>{zones.length} zones</span>
        </div>

        {activeStep === 'import' ? (
          <ImportPanel onFilesLoaded={handleFilesLoaded} message={message} />
        ) : null}

        {activeStep === 'repeaters' ? (
          <RepeaterTable
            repeaters={repeaters}
            onUpdateRepeater={updateRepeater}
            onSelectAll={setAllSelected}
          />
        ) : null}

        {activeStep === 'zones' ? (
          <ZoneBuilder
            selectedCount={selectedRepeaters.length}
            zones={zones}
            zoneSummaries={zoneSummaries}
            repeaters={repeaters}
            onAutoAssignZones={autoAssignSelectedZones}
            onCreateZone={addCustomZone}
            onMoveRepeaterToZone={moveRepeaterToZone}
            onRenameZone={renameZone}
            onDeleteZone={deleteZone}
            onClearZones={clearSelectedZones}
          />
        ) : null}

        {activeStep === 'export' ? (
          <ExportPanel
            selectedCount={selectedRepeaters.length}
            exportModule={exportModule}
            onExportModuleChange={setExportModule}
            apxOptions={apxOptions}
            onApxOptionsChange={setApxOptions}
            onExport={handleExport}
          />
        ) : null}

        <div className="step-actions">
          <button
            className="secondary-button"
            type="button"
            disabled={!previousStep}
            onClick={goToPreviousStep}
          >
            Back
          </button>
          <button
            type="button"
            disabled={!canMoveNext}
            onClick={goToNextStep}
          >
            {nextStep ? `Next: ${nextStep.label}` : 'Workflow complete'}
          </button>
        </div>
      </section>

      <footer className="app-footer">
        <p>
          RB2 is a browser-only amateur radio programming helper for user-reviewable import files; data can be exported from{' '}
          <a
            href="https://www.repeaterbook.com/"
            target="_blank"
            rel="noreferrer"
          >
            RepeaterBook
          </a>
          ; RB2 does not create native Motorola codeplugs, connect to radios,
          or bypass CPS; licensed under{' '}
          <a
            href="https://www.gnu.org/licenses/gpl-3.0.en.html"
            target="_blank"
            rel="noreferrer"
          >
            GNU GPLv3
          </a>
          .
        </p>
      </footer>
    </main>
  )
}

function buildZoneName(repeater, strategy) {
  const source = repeater.source || {}
  const zoneByStrategy = {
    city: readSourceField(source, ['Nearest City', 'City', 'Location']) || 'City',
    county: readSourceField(source, ['County']) || 'County',
    state: readSourceField(source, ['State', 'Province']) || 'State',
    band: getBandZoneName(repeater.rxFrequency),
    mode: repeater.mode || 'Mode',
  }

  return truncateZoneName(zoneByStrategy[strategy] || DEFAULT_ZONE)
}

function readSourceField(source, aliases) {
  const normalizedEntries = Object.entries(source).reduce((fields, [key, value]) => {
    fields[normalizeSourceKey(key)] = value
    return fields
  }, {})

  for (const alias of aliases) {
    const value = normalizedEntries[normalizeSourceKey(alias)]
    if (value) return String(value).trim()
  }

  return ''
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

function normalizeSourceKey(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]/g, '')
}

export default App
