import { useMemo, useState } from 'react'
import { APX_NAME_MAX_LENGTH } from '../modules/apx/apxConstraints'

function ZoneBuilder({
  selectedCount,
  zones,
  zoneSummaries,
  repeaters,
  onAutoAssignZones,
  onCreateZone,
  onMoveRepeaterToZone,
  onRenameZone,
  onDeleteZone,
  onClearZones,
}) {
  const [zoneName, setZoneName] = useState('')
  const [draggingId, setDraggingId] = useState('')
  const [editingZone, setEditingZone] = useState('')
  const [editingZoneName, setEditingZoneName] = useState('')

  const repeatersByZone = useMemo(() => {
    const grouped = new Map(zones.map((zone) => [zone, []]))

    repeaters.forEach((repeater) => {
      const zone = repeater.zone || 'Unassigned'
      if (!grouped.has(zone)) grouped.set(zone, [])
      grouped.get(zone).push(repeater)
    })

    return grouped
  }, [repeaters, zones])

  function handleCreateZone(event) {
    event.preventDefault()
    onCreateZone(zoneName)
    setZoneName('')
  }

  function handleDrop(event, zoneName) {
    event.preventDefault()
    const repeaterId = event.dataTransfer.getData('text/plain') || draggingId
    if (!repeaterId) return
    onMoveRepeaterToZone(repeaterId, zoneName)
    setDraggingId('')
  }

  function handleDeleteZone(zone, channelCount) {
    if (
      channelCount > 0 &&
      !window.confirm(
        `Delete "${zone}" and return ${channelCount} channel${channelCount === 1 ? '' : 's'} to Unassigned?`,
      )
    ) {
      return
    }

    onDeleteZone(zone)
  }

  function startRenameZone(zone) {
    setEditingZone(zone)
    setEditingZoneName(zone)
  }

  function cancelRenameZone() {
    setEditingZone('')
    setEditingZoneName('')
  }

  function saveRenameZone(event, zone) {
    event.preventDefault()
    const cleanName = editingZoneName.trim()
    if (!cleanName || cleanName === zone) {
      cancelRenameZone()
      return
    }

    const existingZone = zones.find(
      (currentZone) =>
        currentZone.toLowerCase() === cleanName.toLowerCase() &&
        currentZone.toLowerCase() !== zone.toLowerCase(),
    )

    if (
      existingZone &&
      !window.confirm(
        `Merge "${zone}" into existing zone "${existingZone}"?`,
      )
    ) {
      return
    }

    onRenameZone(zone, existingZone || cleanName)
    cancelRenameZone()
  }

  function renderZoneColumn(zone) {
    const zoneRepeaters = repeatersByZone.get(zone) || []
    const canDeleteZone = zone !== 'Unassigned'
    const canRenameZone = zone !== 'Unassigned'
    const isRenamingZone = editingZone === zone
    const densityClass =
      zoneRepeaters.length > 30
        ? ' dense'
        : zoneRepeaters.length > 16
          ? ' crowded'
          : ''

    return (
      <section
        key={zone}
        className={`zone-column${densityClass}`}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => handleDrop(event, zone)}
      >
        <div className="zone-column-heading">
          {isRenamingZone ? (
            <form
              className="zone-rename-form"
              onSubmit={(event) => saveRenameZone(event, zone)}
            >
              <input
                autoFocus
                maxLength={APX_NAME_MAX_LENGTH}
                value={editingZoneName}
                onChange={(event) => setEditingZoneName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') cancelRenameZone()
                }}
              />
              <button type="submit">Save</button>
              <button
                className="secondary-button"
                type="button"
                onClick={cancelRenameZone}
              >
                Cancel
              </button>
            </form>
          ) : (
            <h3>{zone}</h3>
          )}
          <div className="zone-column-controls">
            <span>{zoneRepeaters.length}</span>
            {canRenameZone && !isRenamingZone ? (
              <button
                className="zone-edit-button"
                type="button"
                aria-label={`Rename ${zone} zone`}
                title="Rename zone"
                onClick={() => startRenameZone(zone)}
              >
                Edit
              </button>
            ) : null}
            {canDeleteZone && !isRenamingZone ? (
              <button
                className="zone-delete-button"
                type="button"
                aria-label={`Delete ${zone} zone`}
                title="Delete zone"
                onClick={() => handleDeleteZone(zone, zoneRepeaters.length)}
              >
                X
              </button>
            ) : null}
          </div>
        </div>

        <div className="zone-card-list">
          {zoneRepeaters.length === 0 ? (
            <p className="zone-empty">Drop channels here.</p>
          ) : (
            zoneRepeaters.map((repeater) => (
              <article
                key={repeater.id}
                className={
                  repeater.selected
                    ? 'zone-channel-card'
                    : 'zone-channel-card unselected'
                }
                draggable
                onDragStart={(event) => {
                  setDraggingId(repeater.id)
                  event.dataTransfer.setData('text/plain', repeater.id)
                }}
                onDragEnd={() => setDraggingId('')}
              >
                <strong>{repeater.channelName}</strong>
                <span>
                  {repeater.rxFrequency || 'No RX'} | {repeater.mode}
                </span>
              </article>
            ))
          )}
        </div>
      </section>
    )
  }

  const unassignedZone = 'Unassigned'
  const orderedZones = zones.filter((zone) => zone !== unassignedZone)

  return (
    <section className="panel zone-panel zone-workbench" aria-labelledby="zones-title">
      <div className="panel-heading">
        <div>
          <h2 id="zones-title">Zone Organizer</h2>
          <p>Create zones, use quick grouping, or drag channels from Unassigned into zone columns.</p>
        </div>

        <div className="zone-tools">
          <form className="zone-form" onSubmit={handleCreateZone}>
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
            <button
              type="submit"
              disabled={!zoneName.trim()}
            >
              New zone
            </button>
          </form>

          <div className="zone-actions" aria-label="Automatic zone organization">
            <button
              className="secondary-button"
              type="button"
              disabled={selectedCount === 0}
              onClick={() => onAutoAssignZones('state')}
            >
              State
            </button>
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
              onClick={() => onAutoAssignZones('city')}
            >
              City
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
              Clear selected
            </button>
          </div>
        </div>
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

      <div className="zone-board" aria-label="Zone channel board">
        <div className="zone-intake">{renderZoneColumn(unassignedZone)}</div>
        <div className="zone-columns">
          {orderedZones.length === 0 ? (
            <section className="zone-column zone-placeholder">
              <div className="zone-column-heading">
                <h3>No zones yet</h3>
                <div className="zone-column-controls">
                  <span>0</span>
                </div>
              </div>
              <p className="zone-empty">Create a zone or use quick grouping.</p>
            </section>
          ) : (
            orderedZones.map((zone) => renderZoneColumn(zone))
          )}
        </div>
      </div>
    </section>
  )
}

export default ZoneBuilder
