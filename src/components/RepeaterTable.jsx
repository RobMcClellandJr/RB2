import { APX_NAME_MAX_LENGTH } from '../modules/apx/apxConstraints'
import { useState } from 'react'

function RepeaterTable({ repeaters, onUpdateRepeater, onSelectAll }) {
  const [editMode, setEditMode] = useState(false)
  const allSelected =
    repeaters.length > 0 && repeaters.every((repeater) => repeater.selected)

  function updateMode(repeater, mode) {
    onUpdateRepeater(repeater.id, {
      mode,
      source: {
        ...repeater.source,
        Modes: mode,
      },
    })
  }

  function renderCellInput(repeater, fieldName, options = {}) {
    return editMode ? (
      <input
        className={options.compact ? 'table-input compact' : 'table-input'}
        maxLength={options.maxLength}
        value={repeater[fieldName] || ''}
        onChange={(event) =>
          onUpdateRepeater(repeater.id, {
            [fieldName]: event.target.value,
          })
        }
      />
    ) : (
      repeater[fieldName] || options.emptyText || ''
    )
  }

  return (
    <section className="panel table-panel" aria-labelledby="repeaters-title">
      <div className="panel-heading">
        <div>
          <h2 id="repeaters-title">Repeaters</h2>
          <p>Channel names stay editable. Turn on edit mode to correct imported frequency, tone, mode, or NAC data.</p>
          <p className="constraint-note">
            APX display fields are limited to {APX_NAME_MAX_LENGTH} characters.
          </p>
        </div>
        <div className="table-actions">
          <button
            className={editMode ? 'primary-button' : 'secondary-button'}
            type="button"
            onClick={() => setEditMode((current) => !current)}
            disabled={repeaters.length === 0}
          >
            {editMode ? 'Editing on' : 'Edit imported data'}
          </button>
          <button
            className="secondary-button"
            type="button"
            onClick={() => onSelectAll(!allSelected)}
            disabled={repeaters.length === 0}
          >
            {allSelected ? 'Deselect all' : 'Select all'}
          </button>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Use</th>
              <th scope="col">Channel Name</th>
              <th scope="col">RX</th>
              <th scope="col">TX</th>
              <th scope="col">TX Tone</th>
              <th scope="col">RX Tone</th>
              <th scope="col">Mode</th>
              <th scope="col">P25 NAC</th>
              <th scope="col">Callsign</th>
              <th scope="col">Location</th>
            </tr>
          </thead>
          <tbody>
            {repeaters.length === 0 ? (
              <tr>
                <td colSpan="10" className="empty-row">
                  No CSV loaded yet.
                </td>
              </tr>
            ) : (
              repeaters.map((repeater) => (
                <tr key={repeater.id}>
                  <td>
                    <input
                      aria-label={`Select ${repeater.channelName}`}
                      checked={repeater.selected}
                      type="checkbox"
                      onChange={(event) =>
                        onUpdateRepeater(repeater.id, {
                          selected: event.target.checked,
                        })
                      }
                    />
                  </td>
                  <td>
                    <input
                      className="table-input"
                      maxLength={APX_NAME_MAX_LENGTH}
                      value={repeater.channelName}
                      onChange={(event) =>
                        onUpdateRepeater(repeater.id, {
                          channelName: event.target.value,
                        })
                      }
                    />
                  </td>
                  <td>{renderCellInput(repeater, 'rxFrequency', { compact: true })}</td>
                  <td>{renderCellInput(repeater, 'txFrequency', { compact: true })}</td>
                  <td>{renderCellInput(repeater, 'tone', { compact: true, emptyText: 'None' })}</td>
                  <td>{renderCellInput(repeater, 'rxTone', { compact: true, emptyText: repeater.tone || 'None' })}</td>
                  <td>
                    {editMode ? (
                      <select
                        className="table-input compact"
                        value={repeater.mode}
                        onChange={(event) => updateMode(repeater, event.target.value)}
                      >
                        <option value="FM">FM</option>
                        <option value="P25">P25</option>
                        <option value="FM P25">FM + P25</option>
                        <option value="DMR">DMR</option>
                        <option value="D-STAR">D-STAR</option>
                        <option value="Fusion">Fusion</option>
                        <option value="NXDN">NXDN</option>
                      </select>
                    ) : (
                      repeater.mode
                    )}
                  </td>
                  <td>{renderCellInput(repeater, 'digitalAccess', { compact: true, maxLength: 8, emptyText: '-' })}</td>
                  <td>{renderCellInput(repeater, 'callsign', { compact: true })}</td>
                  <td>{renderCellInput(repeater, 'location')}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default RepeaterTable
