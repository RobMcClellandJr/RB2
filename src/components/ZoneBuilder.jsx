import { useState } from 'react'
import { APX_NAME_MAX_LENGTH } from '../modules/apx/apxConstraints'

function ZoneBuilder({ selectedCount, zones, onAssignZone }) {
  const [zoneName, setZoneName] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    onAssignZone(zoneName)
  }

  return (
    <section className="panel zone-panel" aria-labelledby="zones-title">
      <div>
        <h2 id="zones-title">Zones</h2>
        <p>Assign the current selection to a zone name.</p>
      </div>

      <form className="zone-form" onSubmit={handleSubmit}>
        <input
          list="known-zones"
          maxLength={APX_NAME_MAX_LENGTH}
          placeholder="Local Repeaters"
          value={zoneName}
          onChange={(event) => setZoneName(event.target.value)}
        />
        <datalist id="known-zones">
          {zones.map((zone) => (
            <option key={zone} value={zone} />
          ))}
        </datalist>
        <button type="submit" disabled={selectedCount === 0 || !zoneName.trim()}>
          Assign {selectedCount}
        </button>
      </form>
    </section>
  )
}

export default ZoneBuilder
