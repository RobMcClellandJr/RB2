import { APX_NAME_MAX_LENGTH } from '../modules/apx/apxConstraints'
import { APX_BANDS } from '../modules/apx/apxBands'

function ExportPanel({
  selectedCount,
  exportModule,
  onExportModuleChange,
  apxOptions,
  onApxOptionsChange,
  onExport,
}) {
  function updateApxOption(name, value) {
    onApxOptionsChange((current) => ({
      ...current,
      [name]: value,
    }))
  }

  function toggleApxBand(bandId) {
    onApxOptionsChange((current) => {
      const enabledBands = new Set(current.enabledBands)
      if (enabledBands.has(bandId)) {
        enabledBands.delete(bandId)
      } else {
        enabledBands.add(bandId)
      }

      return {
        ...current,
        enabledBands: [...enabledBands],
      }
    })
  }

  return (
    <section className="panel export-panel" aria-labelledby="export-title">
      <div>
        <h2 id="export-title">Export Builder</h2>
        <p>
          Customize the APX XML for CPS import, or download a generic CSV for
          review and future workflows.
        </p>
      </div>
      <div className="export-controls">
        <div className="control-group module-group">
          <div className="control-group-heading">
            <h3>Module</h3>
            <p>Choose the radio family/export target.</p>
          </div>
          <label className="field-control">
            <span>Export module</span>
            <select
              value={exportModule}
              onChange={(event) => onExportModuleChange(event.target.value)}
            >
              <option value="apx">Motorola APX</option>
            </select>
          </label>
        </div>
        <div className="control-group xml-settings">
          <div className="control-group-heading">
            <h3>APX XML</h3>
            <p>Names and radio options used in the CPS import XML.</p>
          </div>
          <div className="control-grid">
            <label className="field-control">
              <span>Personality name base</span>
              <input
                maxLength={APX_NAME_MAX_LENGTH}
                value={apxOptions.personalityName}
                onChange={(event) =>
                  updateApxOption('personalityName', event.target.value)
                }
              />
            </label>
            <label className="field-control">
              <span>System name</span>
              <input
                maxLength={APX_NAME_MAX_LENGTH}
                value={apxOptions.systemName}
                onChange={(event) =>
                  updateApxOption('systemName', event.target.value)
                }
              />
            </label>
            <label className="field-control">
              <span>Radio type</span>
              <select
                value={apxOptions.radioType}
                onChange={(event) => updateApxOption('radioType', event.target.value)}
              >
                <option value="mobile">Mobile</option>
                <option value="portable">Portable</option>
              </select>
            </label>
            {apxOptions.radioType === 'portable' ? (
              <>
                <label className="field-control">
                  <span>Portable model</span>
                  <select
                    value={apxOptions.portableModel}
                    onChange={(event) =>
                      updateApxOption('portableModel', event.target.value)
                    }
                  >
                    <option value="srx2200">SRX 2200</option>
                    <option value="apx8000">APX 8000</option>
                  </select>
                </label>
                <label className="field-control">
                  <span>Top channel name</span>
                  <select
                    value={apxOptions.portableTopChannelName}
                    onChange={(event) =>
                      updateApxOption('portableTopChannelName', event.target.value)
                    }
                  >
                    <option value="callsign">Callsign</option>
                    <option value="rxFrequency">RX frequency</option>
                  </select>
                </label>
              </>
            ) : null}
          </div>
        </div>
        <div className="control-group band-group">
          <fieldset className="band-control">
            <legend>Target APX Bands</legend>
            <div>
              {APX_BANDS.map((band) => (
                <label key={band.id}>
                  <input
                    checked={apxOptions.enabledBands.includes(band.id)}
                    type="checkbox"
                    onChange={() => toggleApxBand(band.id)}
                  />
                  <span>{band.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>
        <div className="control-group download-group">
          <div className="control-group-heading">
            <h3>Download</h3>
            <p>{selectedCount} selected channel{selectedCount === 1 ? '' : 's'}</p>
          </div>
          <div className="export-actions">
            <button
              className="primary-button"
              type="button"
              onClick={() => onExport('apxXml')}
              disabled={selectedCount === 0}
            >
              APX CPS XML
            </button>
          </div>
          <div className="secondary-export-actions">
            <p>Additional download</p>
            <button
              className="secondary-button"
              type="button"
              onClick={() => onExport('generic')}
              disabled={selectedCount === 0}
            >
              Generic CSV
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

export default ExportPanel
