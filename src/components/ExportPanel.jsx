function ExportPanel({ selectedCount, onExport }) {
  return (
    <section className="panel export-panel" aria-labelledby="export-title">
      <div>
        <h2 id="export-title">Export CSV</h2>
        <p>
          Generic CSV is for review and non-CPS workflows. APX CPS uses XML, and
          RB2 does not generate native Motorola codeplug files.
        </p>
        <p className="constraint-note">
          APX XML uses RB2's built-in conventional analog template.
        </p>
      </div>
      <div className="export-actions">
        <button
          type="button"
          onClick={() => onExport('generic')}
          disabled={selectedCount === 0}
        >
          Generic CSV
        </button>
        <button
          type="button"
          onClick={() => onExport('apxXml')}
          disabled={selectedCount === 0}
        >
          APX CPS XML
        </button>
        <button
          type="button"
          onClick={() => onExport('apx')}
          disabled={selectedCount === 0}
        >
          APX review CSV
        </button>
      </div>
    </section>
  )
}

export default ExportPanel
