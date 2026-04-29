import { APX_NAME_MAX_LENGTH } from '../modules/apx/apxConstraints'

function RepeaterTable({ repeaters, onUpdateRepeater, onSelectAll }) {
  const allSelected =
    repeaters.length > 0 && repeaters.every((repeater) => repeater.selected)

  return (
    <section className="panel table-panel" aria-labelledby="repeaters-title">
      <div className="panel-heading">
        <div>
          <h2 id="repeaters-title">Repeaters</h2>
          <p>Edit channel names, choose what exports, and verify tones and modes.</p>
          <p className="constraint-note">
            APX display fields are limited to {APX_NAME_MAX_LENGTH} characters.
          </p>
        </div>
        <button
          className="secondary-button"
          type="button"
          onClick={() => onSelectAll(!allSelected)}
          disabled={repeaters.length === 0}
        >
          {allSelected ? 'Deselect all' : 'Select all'}
        </button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Use</th>
              <th scope="col">Channel Name</th>
              <th scope="col">Zone</th>
              <th scope="col">RX</th>
              <th scope="col">TX</th>
              <th scope="col">Tone</th>
              <th scope="col">Mode</th>
              <th scope="col">Callsign</th>
              <th scope="col">Location</th>
            </tr>
          </thead>
          <tbody>
            {repeaters.length === 0 ? (
              <tr>
                <td colSpan="9" className="empty-row">
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
                  <td>
                    <input
                      className="table-input compact"
                      maxLength={APX_NAME_MAX_LENGTH}
                      value={repeater.zone}
                      onChange={(event) =>
                        onUpdateRepeater(repeater.id, {
                          zone: event.target.value,
                        })
                      }
                    />
                  </td>
                  <td>{repeater.rxFrequency}</td>
                  <td>{repeater.txFrequency}</td>
                  <td>{repeater.tone || 'None'}</td>
                  <td>{repeater.mode}</td>
                  <td>{repeater.callsign}</td>
                  <td>{repeater.location}</td>
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
