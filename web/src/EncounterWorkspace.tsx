import { useState, type DragEvent, type FormEvent } from 'react'
import { AddParticipantDialog, InitiativeDialog } from './EncounterDialogs'
import { conditionDefinitions, conditionDefinition, conditionLabel } from './conditions'
import useEncounterData, { type Character, type ConditionKind, type Participant } from './useEncounterData'

const conditionDragType = 'application/x-janus-condition'

function EncounterWorkspace({ campaignId, characters, selectedId, onSelectId }: {
  campaignId: string; characters: Character[]; selectedId: string | null
  onSelectId: (id: string | null) => void
}) {
  const { api, encounters, selected, setSelected, busy, message, setMessage, mutate, createEncounter,
    duplicateEncounter } =
    useEncounterData(campaignId, selectedId, characters, onSelectId)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dropIndex, setDropIndex] = useState<number | null>(null)
  const [holdDropReady, setHoldDropReady] = useState(false)
  const [initiativeOpen, setInitiativeOpen] = useState(false)
  const [initiativeStep, setInitiativeStep] = useState(0)
  const [prepareSelectedId, setPrepareSelectedId] = useState<string | null>(null)
  const [editingHpIds, setEditingHpIds] = useState<string[]>([])
  const [draggedCondition, setDraggedCondition] = useState<ConditionKind | null>(null)
  const [conditionDropId, setConditionDropId] = useState<string | null>(null)
  const [selectedCondition, setSelectedCondition] = useState<ConditionKind | null>(null)
  const [conditionFilter, setConditionFilter] = useState('')
  const [addParticipantOpen, setAddParticipantOpen] = useState(false)
  const [editingName, setEditingName] = useState(false)
  async function addParticipant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selected) return
    const form = event.currentTarget
    const values = new FormData(form)
    const type = String(values.get('participantType'))
    const saved = await mutate(`${api}/${selected.id}/participants`, 'POST', {
      revision: selected.revision,
      characterId: type === 'character' ? values.get('characterId') : null,
      mobName: type === 'mob' ? values.get('mobName') : null,
      initiative: values.get('initiative'),
      currentHp: values.get('currentHp'),
      isHeld: values.get('isHeld') === 'on',
    }, 'Participant added.')
    if (saved) {
      form.reset()
      if (selected.phase === 'Fight') setAddParticipantOpen(false)
    }
  }

  async function addAllParticipants() {
    if (!selected) return
    await mutate(`${api}/${selected.id}/participants/add-all`, 'POST',
      { revision: selected.revision }, 'Available campaign PCs and NPCs added.')
  }

  async function setCondition(participant: Participant, kind: ConditionKind, add: boolean) {
    if (!selected) return
    const base = `${api}/${selected.id}/participants/${participant.id}/conditions`
    return await mutate(add ? base : `${base}/${kind}`, 'POST',
      { revision: selected.revision, kind }, add ? `${kind} applied.` : `${kind} removed.`)
  }

  async function savePromptedInitiative(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selected) return
    const participant = selected.participants.filter((item) => !item.isHeld)[initiativeStep]
    if (!participant) return
    const initiative = new FormData(event.currentTarget).get('initiative')
    const saved = await mutate(`${api}/${selected.id}/participants/${participant.id}/initiative`, 'PATCH',
      { revision: selected.revision, initiative }, 'Initiative saved.')
    if (saved) setInitiativeStep((step) => step + 1)
  }

  async function adjustHp(event: FormEvent<HTMLFormElement>, participantId: string, action?: 'damage' | 'heal') {
    event.preventDefault()
    if (!selected) return
    const chosenAction = action ?? (event.nativeEvent as SubmitEvent).submitter?.getAttribute('value')
    if (chosenAction !== 'damage' && chosenAction !== 'heal') return
    const form = event.currentTarget
    const amount = new FormData(form).get('amount')
    const saved = await mutate(`${api}/${selected.id}/participants/${participantId}/${chosenAction}`, 'POST',
      { revision: selected.revision, amount }, chosenAction === 'damage' ? 'Damage applied.' : 'Healing applied.')
    if (saved) form.reset()
  }

  async function saveCurrentHp(event: FormEvent<HTMLFormElement>, participantId: string) {
    event.preventDefault()
    if (!selected) return
    const currentHp = new FormData(event.currentTarget).get('currentHp')
    const saved = await mutate(`${api}/${selected.id}/participants/${participantId}/hp`, 'PATCH',
      { revision: selected.revision, currentHp }, 'HP saved.')
    if (saved) setEditingHpIds((ids) => ids.filter((id) => id !== participantId))
  }

  async function saveEncounterName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selected) return
    const name = new FormData(event.currentTarget).get('name')
    const saved = await mutate(`${api}/${selected.id}/name`, 'PATCH',
      { revision: selected.revision, name }, 'Encounter name updated.')
    if (saved) setEditingName(false)
  }

  function moveToIndex(participantId: string, targetIndex: number) {
    if (!selected || selected.phase !== 'Fight' || busy) return
    const order = selected.participants.filter((participant) => !participant.isHeld).map((participant) => participant.id)
    const oldIndex = order.indexOf(participantId)
    if (oldIndex < 0 || targetIndex < 0 || targetIndex >= order.length || oldIndex === targetIndex) return
    order.splice(oldIndex, 1)
    order.splice(targetIndex, 0, participantId)
    void mutate(`${api}/${selected.id}/reorder`, 'POST',
      { revision: selected.revision, orderedIds: order, makeActive: targetIndex === 0 },
      targetIndex === 0 ? 'Participant moved to the top and made active.' : 'Turn order changed.')
  }

  function insertionIndexAt(list: HTMLOListElement, clientY: number): number {
    const tiles = Array.from(list.children)
    const index = tiles.findIndex((tile) => clientY < tile.getBoundingClientRect().top + tile.getBoundingClientRect().height / 2)
    return index < 0 ? tiles.length : Math.max(0, index)
  }

  function dropOnList(event: DragEvent<HTMLOListElement>) {
    if (!selected || selected.phase !== 'Fight' || busy) return
    if (draggedCondition || event.dataTransfer.types.includes(conditionDragType)) {
      event.preventDefault()
      endConditionDrag()
      return
    }
    event.preventDefault()
    const sourceId = draggedId ?? event.dataTransfer.getData('text/plain')
    const sourceIndex = activeParticipants.findIndex((participant) => participant.id === sourceId)
    const insertionIndex = insertionIndexAt(event.currentTarget, event.clientY)
    endParticipantDrag()
    if (sourceIndex < 0) {
      if (heldParticipants.some((participant) => participant.id === sourceId))
        void mutate(`${api}/${selected.id}/participants/${sourceId}/activate`, 'POST',
          { revision: selected.revision, targetIndex: insertionIndex, makeActive: insertionIndex === 0 }, 'Participant moved to the active list.')
      return
    }
    moveToIndex(sourceId, insertionIndex > sourceIndex ? insertionIndex - 1 : insertionIndex)
  }

  const activeParticipants = selected?.participants.filter((participant) => !participant.isHeld) ?? []
  const heldParticipants = selected?.participants.filter((participant) => participant.isHeld) ?? []
  const available = characters.filter((character) =>
    !selected?.participants.some((participant) => participant.characterId === character.id))
  function hpEditor(participant: Participant) {
    if (!selected || selected.phase !== 'Prepare') return null
    return <div className="hp-controls">
      <form className="hp-field-form" key={`${participant.id}-hp-${participant.currentHp}`}
        onSubmit={(event) => void saveCurrentHp(event, participant.id)}>
        <label htmlFor={`hp-${participant.id}`}>Current HP</label>
        <div className="hp-input-line">
          <input id={`hp-${participant.id}`} name="currentHp" defaultValue={participant.currentHp ?? ''}
            inputMode="decimal" />
          <button type="submit" disabled={busy}>Save</button>
        </div>
      </form>
    </div>
  }

  function fightHpRow(participant: Participant) {
    const adjustmentFormId = `adjust-hp-${participant.id}`
    return <div className="fight-hp-row">
      <form id={adjustmentFormId} className="quick-hp-form"
        onSubmit={(event) => void adjustHp(event, participant.id)} />
      {participant.currentHp !== null && !editingHpIds.includes(participant.id)
        ? <div className="fight-current-hp-display">
          <span>HP: {participant.currentHp}</span>
          <button type="button" className="hp-edit-button" disabled={busy}
            aria-label={`Edit current HP for ${participant.name}`} title="Edit current HP"
            onClick={() => setEditingHpIds((ids) => [...ids, participant.id])}>✎</button>
        </div>
        : <form className="fight-current-hp-form" key={`${participant.id}-fight-hp-${participant.currentHp}`}
          onSubmit={(event) => void saveCurrentHp(event, participant.id)}>
          <label htmlFor={`fight-hp-${participant.id}`}>HP:</label>
          <input id={`fight-hp-${participant.id}`} name="currentHp"
            aria-label={`Current HP for ${participant.name}`} defaultValue={participant.currentHp ?? ''}
            placeholder="Not set" inputMode="decimal" />
          <button type="submit" disabled={busy}>Save</button>
          {participant.currentHp !== null && <button type="button" disabled={busy}
            onClick={() => setEditingHpIds((ids) => ids.filter((id) => id !== participant.id))}>Cancel</button>}
        </form>}
      <input form={adjustmentFormId} className="hp-adjustment-input" name="amount" required inputMode="decimal" size={4}
        aria-label={`HP adjustment for ${participant.name}`} />
      <button form={adjustmentFormId} className="hp-adjust-button" type="submit" value="damage"
        disabled={busy || participant.currentHp === null}>Damage</button>
      <button form={adjustmentFormId} className="hp-adjust-button" type="submit" value="heal"
        disabled={busy || participant.currentHp === null}>Heal</button>
    </div>
  }

  function kindBadge(participant: Participant) {
    return <span className={`participant-kind-icon ${participant.kind.toLowerCase()}`}
      title={participant.kind.toUpperCase()}>{participant.kind.toUpperCase()}</span>
  }

  function addParticipantPanel(inDialog: boolean) {
    return <div className={`add-participant${inDialog ? ' add-participant-dialog' : ''}`}>
      <div className="add-participant-heading">
        <h3 id={inDialog ? 'add-participant-title' : undefined}>Add a PC, NPC, or mob</h3>
        {inDialog && <button type="button" disabled={busy}
          onClick={() => setAddParticipantOpen(false)}>Close</button>}
      </div>
      {inDialog && message && <p role="status">{message}</p>}
      <h5>Add a campaign character</h5>
      {selected?.phase === 'Prepare' && <button type="button" disabled={busy || available.length === 0}
        onClick={() => void addAllParticipants()}>Add All</button>}
      {available.length === 0 ? <p>No available PCs or NPCs in this campaign.</p> :
        <form onSubmit={(event) => void addParticipant(event)}>
          <input type="hidden" name="participantType" value="character" />
          <label>PC or NPC<select name="characterId" required>
            {available.map((character) => <option key={character.id} value={character.id}>
              {character.name} ({character.kind.toUpperCase()})
            </option>)}
          </select></label>
          <label>Starting HP (optional)<input name="currentHp" inputMode="decimal" /></label>
          <label className="hold-checkbox"><input type="checkbox" name="isHeld" /> Add to Hold</label>
          <button type="submit" disabled={busy}>Add character</button>
        </form>}
      <h5>Add an encounter-only mob</h5>
      <form onSubmit={(event) => void addParticipant(event)}>
        <input type="hidden" name="participantType" value="mob" />
        <label>Mob name<input name="mobName" required /></label>
        <label>Starting HP (optional)<input name="currentHp" inputMode="decimal" /></label>
        <label className="hold-checkbox"><input type="checkbox" name="isHeld" /> Add to Hold</label>
        <button type="submit" disabled={busy}>Add mob</button>
      </form>
    </div>
  }

  function startParticipantDrag(event: DragEvent<HTMLLIElement>, participantId: string) {
    endConditionDrag()
    setDraggedId(participantId)
    setDropIndex(null)
    setHoldDropReady(false)
    event.dataTransfer.setData('text/plain', participantId)
    event.dataTransfer.effectAllowed = 'move'
  }

  function endParticipantDrag() {
    setDraggedId(null)
    setDropIndex(null)
    setHoldDropReady(false)
  }

  function endConditionDrag() {
    setDraggedCondition(null)
    setConditionDropId(null)
  }

  async function applyCondition(participant: Participant, kind: ConditionKind) {
    if (!selected || selected.phase !== 'Fight' || busy) return
    if (participant.conditions.some((condition) => condition.kind === kind)) return
    if (await setCondition(participant, kind, true)) setSelectedCondition(null)
  }

  function statusPanel() {
    return <section className="status-palette" aria-label="Statuses">
      <h5>Statuses</h5>
      <p id="status-palette-help">Drag a status onto a participant, or select one and press Enter on a participant.</p>
      <label className="status-filter">Filter statuses<input type="search" value={conditionFilter}
        onChange={(event) => setConditionFilter(event.currentTarget.value)} /></label>
      <div className="status-palette-list">{conditionDefinitions.filter((definition) =>
        definition.label.toLowerCase().includes(conditionFilter.trim().toLowerCase()))
        .map(({ kind, label, summary }) => <button type="button" key={kind} title={summary}
        draggable={!busy} disabled={busy} aria-pressed={selectedCondition === kind}
        onClick={() => setSelectedCondition((current) => current === kind ? null : kind)}
        onDragStart={(event) => {
          endParticipantDrag()
          setSelectedCondition(null)
          setDraggedCondition(kind)
          event.dataTransfer.setData(conditionDragType, kind)
          event.dataTransfer.effectAllowed = 'copy'
        }} onDragEnd={endConditionDrag}>{label}</button>)}</div>
    </section>
  }

  function activeConditionSummary(participant: Participant) {
    const kinds = [...new Set([...participant.conditions.map((condition) => condition.kind),
      ...(participant.status && participant.status !== 'AliveAdjacent' ? [participant.status] : [])])]
    return <section className="active-condition-summary" aria-label={`Status effects for ${participant.name}`} aria-live="polite">
      {kinds.length === 0 && !participant.status ? <p>No statuses applied.</p> : <>
        <ul>{kinds.map((kind) => {
          const definition = conditionDefinition(kind)
          return <li key={kind}><strong>{definition
            ? <a href={definition.source} target="_blank" rel="noreferrer">{definition.label}</a>
            : kind}:</strong> {definition?.summary ?? 'Check the effect that applied this status.'}</li>
        })}
        {participant.status === 'AliveAdjacent' && <li><strong>alive adjacent:</strong> Janus house status at HP −10 or below.
          This participant stays in the turn order; resolve the outcome manually.</li>}</ul>
        <p className="condition-reminder">D&amp;D 3.5 reminders; resolve effects manually.</p>
      </>}
    </section>
  }

  function holdPanel() {
    if (!selected) return null
    return <section className={`held-section${selected.phase === 'Fight' ? ' fight-hold-sidebar' : ''}${holdDropReady ? ' drop-ready' : ''}`}
      aria-label="Hold list"
      onDragOver={(event) => {
        if (selected.phase !== 'Fight' || busy || !activeParticipants.some((item) => item.id === draggedId)) return
        event.preventDefault()
        event.dataTransfer.dropEffect = 'move'
        setHoldDropReady(true)
        setDropIndex(null)
      }}
      onDragLeave={(event) => {
        if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget))
          setHoldDropReady(false)
      }}
      onDrop={(event) => {
        if (selected.phase !== 'Fight' || busy) return
        event.preventDefault()
        const sourceId = draggedId ?? event.dataTransfer.getData('text/plain')
        endParticipantDrag()
        if (activeParticipants.some((item) => item.id === sourceId))
          void mutate(`${api}/${selected.id}/participants/${sourceId}/hold`, 'POST',
            { revision: selected.revision }, 'Participant moved to Hold.')
      }}>
      <div className="encounter-section-heading">
        <h5>Hold ({heldParticipants.length})</h5>
        <span className="section-help" role="img" tabIndex={0} title={holdHelp}
          aria-label={holdHelp}>?</span>
        {heldParticipants.length === 0 && <span className="hold-empty">No participants on Hold.</span>}
      </div>
      {heldParticipants.length > 0 && <ul className="held-list">{heldParticipants.map((participant) => <li key={participant.id}
          draggable={selected.phase === 'Fight' && !busy}
          onDragStart={(event) => startParticipantDrag(event, participant.id)}
          onDragEnd={endParticipantDrag}>
          {selected.phase === 'Fight' ? <button type="button" className="held-name" disabled={busy}
            title={participant.name}
            aria-label={`Release ${participant.name} to turn order`}
            onClick={() => void mutate(`${api}/${selected.id}/participants/${participant.id}/activate`, 'POST',
              { revision: selected.revision, targetIndex: activeParticipants.length }, 'Participant moved to the active list.')}>
            {participant.name}
          </button> : <div className="held-row">{kindBadge(participant)}<strong>{participant.name}</strong>
            <span className="held-meta">Turns completed: {participant.turnCount} · HP: {participant.currentHp ?? 'Not set'}</span>
            {selected.phase === 'Prepare' && <>
              <button type="button" disabled={busy}
                onClick={() => setPrepareSelectedId((id) => id === participant.id ? null : participant.id)}>
                {prepareSelectedId === participant.id ? 'Close HP' : 'Edit HP'}</button>
              <button type="button" disabled={busy} onClick={() => void mutate(
                `${api}/${selected.id}/participants/${participant.id}/activate`, 'POST',
                { revision: selected.revision, targetIndex: activeParticipants.length }, 'Participant moved to active.')}>Move to active</button>
              <button type="button" disabled={busy} onClick={() => void mutate(
                `${api}/${selected.id}/participants/${participant.id}/remove`, 'POST',
                { revision: selected.revision }, 'Participant removed.')}>Remove</button>
            </>}
          </div>}
          {selected.phase === 'Prepare' && prepareSelectedId === participant.id && hpEditor(participant)}
        </li>)}</ul>}
    </section>
  }

  const holdHelp = `Held participants wait outside the turn order and do not affect Round or Turn counts.${selected?.phase === 'Fight' ? ' Drag a participant here to hold them. Drag a name into the turn order to release them, or select the name to release at the end.' : ''}`
  const turnOrderHelp = 'Drop above the active participant to move someone to the top and make them active. Other slots keep the current active participant. Focus a tile and use Alt+Up/Down to move it, Alt+Home to make it active at the top, or Alt+H to hold it.'

  return <div className="encounter-workspace">
    {message && <p className="account-message" role="status">{message}</p>}
    {!selectedId && <>
    <h4>Encounters</h4>
    <p>Prepare and run encounters here. Changes save as you make them.</p>
    <form onSubmit={(event) => void createEncounter(event)}>
      <label>Encounter name<input name="encounterName" required /></label>
      <button type="submit" disabled={busy}>Create encounter</button>
    </form>
    {encounters.length === 0 ? <p>No encounters yet.</p> : <div className="encounter-groups">
      {(['Fight', 'Prepare', 'Finished'] as const).map((phase) => {
        const items = encounters.filter((encounter) => encounter.phase === phase)
        if (items.length === 0) return null
        const list = <ul className="encounter-list">{items.map((encounter) => <li key={encounter.id}>
        <div className="encounter-list-actions">
          <button type="button" className={selectedId === encounter.id ? 'selected' : ''}
            disabled={busy} onClick={() => { setEditingName(false); setSelected(null); onSelectId(encounter.id) }}>
            {encounter.name} <small>{encounter.phase}</small>
          </button>
          <button type="button" className="encounter-duplicate"
            aria-label={`Duplicate ${encounter.name}`} disabled={busy}
            onClick={() => void duplicateEncounter(encounter.id)}>Duplicate</button>
        </div>
      </li>)}</ul>
        return phase === 'Finished' ? <details key={phase} className="encounter-group finished-group">
          <summary>Finished ({items.length})</summary>{list}</details>
          : <section key={phase} className="encounter-group"><h5>{phase === 'Fight' ? 'Active fights' : 'Prepare'} ({items.length})</h5>{list}</section>
      })}
    </div>}
    </>}
    {selectedId && !selected && <p>Loading encounter…</p>}
    {selectedId && selected && <div className="encounter-detail">
      <div className="encounter-heading">
        {editingName ? <form className="encounter-rename-form" onSubmit={(event) => void saveEncounterName(event)}>
          <label>Encounter name<input name="name" defaultValue={selected.name} required /></label>
          <button type="submit" disabled={busy}>Save name</button>
          <button type="button" disabled={busy} onClick={() => setEditingName(false)}>Cancel</button>
        </form> : <>
          <h2>{selected.name}</h2>
          <div className="encounter-heading-actions">
            <button type="button" disabled={busy} onClick={() => { setMessage(''); setEditingName(true) }}>
              Edit name
            </button>
            {selected.phase === 'Prepare' && <button type="button" disabled={busy || activeParticipants.length === 0}
              onClick={() => { setMessage(''); setInitiativeStep(0); setInitiativeOpen(true) }}>Begin Fight</button>}
          </div>
        </>}
      </div>
      <p>Phase: {selected.phase}. {activeParticipants.length} active, {heldParticipants.length} held.
        {selected.phase !== 'Prepare' && <> Round {selected.round}.</>}</p>
      {selected.phase === 'Prepare' && addParticipantPanel(false)}
      {selected.phase !== 'Fight' && holdPanel()}
      <div className={selected.phase === 'Fight' ? 'fight-board' : undefined}>
      <section className={selected.phase === 'Prepare' ? 'prepare-active-section' : selected.phase === 'Fight' ? 'fight-turn-order' : undefined}
        aria-label={selected.phase === 'Prepare' ? 'Active participants' : undefined}>
      <div className="encounter-section-heading turn-order-heading">
        <h5>{selected.phase === 'Prepare' ? `Active (${activeParticipants.length})` : selected.phase === 'Fight' ? 'Turn order' : 'Final order'}</h5>
        {selected.phase === 'Fight' && <>
          <span className="section-help" role="img" tabIndex={0} title={turnOrderHelp}
            aria-label={turnOrderHelp}>?</span>
          <div className="turn-order-actions">
            <button type="button" disabled={busy} onClick={() => setAddParticipantOpen(true)}>Add Participant</button>
            <button type="button" disabled={busy} onClick={() => {
              if (window.confirm('End this encounter? It cannot return to Fight.'))
                void mutate(`${api}/${selected.id}/end`, 'POST',
                  { revision: selected.revision }, 'Encounter ended.')
            }}>End encounter</button>
          </div>
        </>}
      </div>
      {activeParticipants.length === 0 ? <div className={`empty-active-list ${draggedId && selected.phase === 'Fight' ? 'drop-ready' : ''}`}
        onDragOver={(event) => {
          if (selected.phase === 'Fight' && !busy && draggedId) { event.preventDefault(); event.dataTransfer.dropEffect = 'move' }
        }}
        onDrop={(event) => {
          if (selected.phase !== 'Fight' || !draggedId || busy) return
          event.preventDefault()
          const sourceId = draggedId
          endParticipantDrag()
          void mutate(`${api}/${selected.id}/participants/${sourceId}/activate`, 'POST',
            { revision: selected.revision, targetIndex: 0 }, 'Participant moved to the active list.')
        }}>
        {selected.phase === 'Fight' ? 'No active participants. Drop a held participant here to resume turns.'
          : 'Add a PC, NPC, or mob to prepare the order.'}</div> :
        <ol className={`encounter-participants ${selected.phase === 'Fight' ? 'fight-list' : ''}`}
          onDragOver={(event) => {
            if (selected.phase === 'Fight' && !busy && draggedId && !draggedCondition) {
              event.preventDefault()
              event.dataTransfer.dropEffect = 'move'
              setDropIndex(insertionIndexAt(event.currentTarget, event.clientY))
            }
          }}
          onDragLeave={(event) => {
            const bounds = event.currentTarget.getBoundingClientRect()
            if (event.clientX < bounds.left || event.clientX > bounds.right
              || event.clientY < bounds.top || event.clientY > bounds.bottom) setDropIndex(null)
          }}
          onDrop={dropOnList}>{activeParticipants.map((participant, index) => {
          const active = selected.phase === 'Fight' && selected.activeParticipantId === participant.id
          const inactive = selected.phase === 'Fight' && !active
          const summary = <>
            {kindBadge(participant)}
            <strong title={participant.name}>{participant.name}</strong>
            {selected.phase === 'Fight' && <span className="fight-turn-count">Turn: {participant.turnCount}</span>}
          </>
          const marker = selected.phase === 'Fight' && draggedId
            ? dropIndex === index ? 'drop-before'
              : dropIndex === activeParticipants.length && index === activeParticipants.length - 1 ? 'drop-end' : ''
            : ''
          return <li key={participant.id} className={`${active ? 'active' : ''} ${conditionDropId === participant.id ? 'condition-drop-ready' : ''} ${marker} ${participant.status === 'Disabled' ? 'disabled-hp' : participant.status === 'Dying' ? 'dying' : participant.status === 'AliveAdjacent' ? 'alive-adjacent' : ''}`}
            aria-current={active ? 'true' : undefined}
            aria-label={active ? `Active participant: ${participant.name}` : undefined}
            draggable={selected.phase === 'Fight' && !busy}
            tabIndex={selected.phase === 'Fight' ? 0 : undefined}
            aria-keyshortcuts={selected.phase === 'Fight' ? 'Alt+ArrowUp Alt+ArrowDown Alt+Home Alt+H' : undefined}
            onKeyDown={(event) => {
              if (event.target !== event.currentTarget || busy || selected.phase !== 'Fight') return
              if (event.key === 'Escape') { setSelectedCondition(null); return }
              if (selectedCondition && (event.key === 'Enter' || event.key === ' ')) {
                event.preventDefault()
                void applyCondition(participant, selectedCondition)
                return
              }
              if (!event.altKey) return
              if (event.key === 'Home') {
                event.preventDefault()
                moveToIndex(participant.id, 0)
                return
              }
              if (event.key.toLowerCase() === 'h') {
                event.preventDefault()
                void mutate(`${api}/${selected.id}/participants/${participant.id}/hold`, 'POST',
                  { revision: selected.revision }, 'Participant moved to Hold.')
                return
              }
              if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
                event.preventDefault()
                moveToIndex(participant.id, index + (event.key === 'ArrowUp' ? -1 : 1))
              }
            }}
            aria-describedby={selected.phase === 'Fight' && selectedCondition ? 'status-palette-help' : undefined}
            onDragOver={(event) => {
              if (selected.phase !== 'Fight' || !draggedCondition || busy) return
              event.preventDefault()
              event.stopPropagation()
              event.dataTransfer.dropEffect = 'copy'
              setConditionDropId(participant.conditions.some((condition) => condition.kind === draggedCondition) ? null : participant.id)
            }}
            onDragLeave={(event) => {
              if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget))
                setConditionDropId((id) => id === participant.id ? null : id)
            }}
            onDrop={(event) => {
              if (selected.phase !== 'Fight' || !draggedCondition || busy) return
              event.preventDefault()
              event.stopPropagation()
              const kind = draggedCondition
              endConditionDrag()
              void applyCondition(participant, kind)
            }}
            onDragStart={(event) => startParticipantDrag(event, participant.id)}
            onDragEnd={endParticipantDrag}>
            {selected.phase === 'Prepare' ? <div className={`prepare-row ${prepareSelectedId === participant.id ? 'selected' : ''}`}>
              <div className="prepare-row-main">
                <button type="button" className="prepare-row-select" aria-expanded={prepareSelectedId === participant.id}
                  onClick={() => setPrepareSelectedId((id) => id === participant.id ? null : participant.id)}>
                  {kindBadge(participant)}<strong>{participant.name}</strong>
                  <span>HP: {participant.currentHp ?? 'Not set'}</span>
                  {participant.status && <span className="hp-status">{participant.status === 'AliveAdjacent' ? 'alive adjacent' : participant.status}</span>}
                </button>
                <button type="button" disabled={busy} onClick={() => void mutate(
                `${api}/${selected.id}/participants/${participant.id}/remove`, 'POST',
                { revision: selected.revision }, 'Participant removed.')}>Remove</button>
                <button type="button" disabled={busy} onClick={() => void mutate(
                  `${api}/${selected.id}/participants/${participant.id}/hold`, 'POST',
                  { revision: selected.revision }, 'Participant moved to Hold.')}>Hold</button>
              </div>
              {prepareSelectedId === participant.id && hpEditor(participant)}
            </div> : <>
              <div className={`fight-tile-heading${selected.phase === 'Fight' ? ' fight-row-heading' : ''}${inactive ? ' inactive-fight-heading' : ''}`}>
                {selected.phase === 'Fight' ? <div className="fight-participant-summary">{summary}
                </div> : summary}
                {selected.phase === 'Fight' && fightHpRow(participant)}
                {selected.phase === 'Fight' && <div className="condition-actions">

                  {participant.status === 'Disabled' && <span className="hp-status disabled-label">Disabled</span>}
                  {participant.status === 'Dying' && <span className="hp-status dying-label">Dying</span>}
                  {participant.status === 'AliveAdjacent' && <span className="hp-status alive-adjacent-label">alive adjacent</span>}
                  {participant.conditions.map((condition) => <span className="condition-bubble" key={condition.kind}>
                    {conditionLabel(condition.kind)} · {condition.turnCount}
                    <button type="button" aria-label={`Remove ${conditionLabel(condition.kind)} from ${participant.name}`}
                      disabled={busy} onClick={() => void setCondition(participant, condition.kind, false)}>×</button>
                  </span>)}
                </div>}
              </div>
              {active && <div className="active-turn-row">
                <div className="active-turn-controls" role="group" aria-label={`Turn actions for ${participant.name}`}>
                  <button type="button" disabled={busy} onClick={() => void mutate(`${api}/${selected.id}/next`, 'POST',
                    { revision: selected.revision }, 'Turn completed.')}>Next</button>
                  <button type="button" disabled={busy} onClick={() => void mutate(`${api}/${selected.id}/skip`, 'POST',
                    { revision: selected.revision }, 'Turn skipped.')}>Skip</button>
                </div>
                {activeConditionSummary(participant)}
              </div>}
              {selected.phase !== 'Fight' && <p className="fight-tile-meta">Turns completed: {participant.turnCount} · HP: {participant.currentHp ?? 'Not set'}
                {participant.status === 'Disabled' && <span className="hp-status disabled-label">Disabled</span>}
                {participant.status === 'Dying' && <span className="hp-status dying-label">Dying</span>}
                {participant.status === 'AliveAdjacent' && <span className="hp-status alive-adjacent-label">alive adjacent</span>}
              </p>}

            </>}
          </li>
        })}</ol>}
      </section>
      {selected.phase === 'Fight' && <aside className="fight-sidebar" aria-label="Battle tools">
        {holdPanel()}
        {statusPanel()}
      </aside>}
      </div>
      {selected.phase === 'Fight' && addParticipantOpen && <AddParticipantDialog
        onClose={() => setAddParticipantOpen(false)}>
        {addParticipantPanel(true)}
      </AddParticipantDialog>}
      {initiativeOpen && selected.phase === 'Prepare' && <InitiativeDialog
        participants={activeParticipants} step={initiativeStep} setStep={setInitiativeStep}
        message={message} busy={busy} onSave={(event) => void savePromptedInitiative(event)}
        onClose={() => setInitiativeOpen(false)} onConfirm={() => {
          void mutate(`${api}/${selected.id}/fight`, 'POST',
            { revision: selected.revision }, 'Fight started.').then((saved) => {
              if (saved) setInitiativeOpen(false)
            })
        }} />}
    </div>}
  </div>
}

export default EncounterWorkspace
