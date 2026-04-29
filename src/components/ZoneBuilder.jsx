import { useState } from 'react'
import { APX_NAME_MAX_LENGTH } from '../modules/apx/apxConstraints'

function ZoneBuilder({
  selectedCount,
  zones,
  zoneSummaries,
  onAssignZone,
  onAutoAssignZones,
  onClearZones,
}) {
  const [zoneName, setZoneName] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    onAssignZone(zoneName)
  }

  return (
    <section className="panel zone-panel" aria-labelledby="zones-title">
      <div>
        <h2 id="zones-title">Zone Organizer</h2>
        <p>Group selected repeaters before building the XML zone assignment.</p>
      </div>

      <div className="zone-tools">
        <form className="zone-form" onSubmit={handleSubmit}>
          <input
            list="known-zones"
            maxLength={APX_NAME_MAX_LENGTH}
            placeholder="Zone name"
            value={zoneName}
            onChange={(event) => setZoneName(event.target.value)}
          />
          <datalist id="known-zones">
            {zones.map((zone) => (
              <option key={zone} value={zone} />
            ))}
          </datalist>
          <button type="submit" disabled={selectedCount === 0 || !zoneName.trim()}>
            Assign selected
          </button>
        </form>

        <div className="zone-actions" aria-label="Automatic zone organization">
          <button
            className="secondary-button"
            type="button"
            disabled={selectedCount === 0}
            onClick={() => onAutoAssignZones('county')}
          >
            County
          </button>
          <button
            className="secondary-button"
            type="button"
            disabled={selectedCount === 0}
            onClick={() => onAutoAssignZones('band')}
          >
            Band
          </button>
          <button
            className="secondary-button"
            type="button"
            disabled={selectedCount === 0}
            onClick={() => onAutoAssignZones('mode')}
          >
            Mode
          </button>
          <button
            className="secondary-button"
            type="button"
            disabled={selectedCount === 0}
            onClick={onClearZones}
          >
            Clear
          </button>
        </div>

        {zoneSummaries.length > 0 ? (
          <div className="zone-summary" aria-label="Zone summary">
            {zoneSummaries.map((zone) => (
              <span key={zone.name}>
                {zone.name}: {zone.total}
                {zone.selected ? ` (${zone.selected} selected)` : ''}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  )
}

export default ZoneBuilder
