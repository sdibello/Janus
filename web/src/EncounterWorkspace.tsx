import { useState, type DragEvent, type FormEvent } from 'react'
import { AddParticipantDialog, ConditionDialog, InitiativeDialog } from './EncounterDialogs'
import useEncounterData, { type Character, type ConditionKind, type Participant } from './useEncounterData'

function EncounterWorkspace({ campaignId, characters, selectedId, onSelectId }: {
  campaignId: string; characters: Character[]; selectedId: string | null
  onSelectId: (id: string | null) => void
}) {
  const { api, encounters, selected, setSelected, busy, message, setMessage, mutate, createEncounter,
    duplicateEncounter } =
    useEncounterData(campaignId, selectedId, characters, onSelectId)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dropIndex, setDropIndex] = useState<number | null>(null)
  const [initiativeOpen, setInitiativeOpen] = useState(false)
  const [initiativeStep, setInitiativeStep] = useState(0)
  const [prepareSelectedId, setPrepareSelectedId] = useState<string | null>(null)
  const [editingHpIds, setEditingHpIds] = useState<string[]>([])
  const [conditionParticipantId, setConditionParticipantId] = useState<string | null>(null)
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
    await mutate(add ? base : `${base}/${kind}`, 'POST',
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
      { revision: selected.revision, orderedIds: order }, 'Turn order changed.')
  }

  function insertionIndexAt(list: HTMLOListElement, clientY: number): number {
    const tiles = Array.from(list.children)
    const index = tiles.findIndex((tile) => clientY < tile.getBoundingClientRect().top + tile.getBoundingClientRect().height / 2)
    return index < 0 ? tiles.length : Math.max(1, index)
  }

  function dropOnList(event: DragEvent<HTMLOListElement>) {
    if (!selected || selected.phase !== 'Fight' || busy) return
    event.preventDefault()
    const sourceId = draggedId ?? event.dataTransfer.getData('text/plain')
    const sourceIndex = activeParticipants.findIndex((participant) => participant.id === sourceId)
    const insertionIndex = insertionIndexAt(event.currentTarget, event.clientY)
    setDropIndex(null)
    setDraggedId(null)
    if (sourceIndex < 0) {
      if (heldParticipants.some((participant) => participant.id === sourceId))
        void mutate(`${api}/${selected.id}/participants/${sourceId}/activate`, 'POST',
          { revision: selected.revision, targetIndex: insertionIndex }, 'Participant moved to the active list.')
      return
    }
    moveToIndex(sourceId, insertionIndex > sourceIndex ? insertionIndex - 1 : insertionIndex)
  }

  const activeParticipants = selected?.participants.filter((participant) => !participant.isHeld) ?? []
  const heldParticipants = selected?.participants.filter((participant) => participant.isHeld) ?? []
  const available = characters.filter((character) =>
    !selected?.participants.some((participant) => participant.characterId === character.id))
  const conditionParticipant = selected?.participants.find((participant) => participant.id === conditionParticipantId)
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

  function fightAdjustment(participant: Participant) {
    if (!selected) return null
    return <form className="quick-hp-form" onSubmit={(event) => void adjustHp(event, participant.id)}>
      <input name="amount" required inputMode="decimal"
        aria-label={`HP adjustment for ${participant.name}`} />
      <button type="submit" value="damage" disabled={busy || participant.currentHp === null}>Damage</button>
      <button type="submit" value="heal" disabled={busy || participant.currentHp === null}>Heal</button>
    </form>
  }

  function fightHpRow(participant: Participant) {
    return <div className="fight-hp-row">
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
      {fightAdjustment(participant)}
      {participant.status === 'Disabled' && <span className="hp-status disabled-label">Disabled</span>}
      {participant.status === 'Dying' && <span className="hp-status dying-label">Dying</span>}
      {participant.status === 'AliveAdjacent' && <span className="hp-status alive-adjacent-label">alive adjacent</span>}
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

  const holdHelp = `Held participants wait outside the turn order and do not affect Round or Turn counts.${selected?.phase === 'Fight' ? ' Drag one into the turn order to release them.' : ''}`
  const turnOrderHelp = 'Drag a participant to the arrow between tiles or at the end. For keyboard reordering, focus a tile and press Alt+Up or Alt+Down. Reordering keeps the current active participant.'

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
      <section className="held-section" aria-label="Hold list">
        <div className="encounter-section-heading">
          <h5>Hold ({heldParticipants.length})</h5>
          <span className="section-help" role="img" tabIndex={0} title={holdHelp}
            aria-label={holdHelp}>?</span>
          {heldParticipants.length === 0 && <span className="hold-empty">No participants on Hold.</span>}
        </div>
        {heldParticipants.length > 0 && <ul className="held-list">{heldParticipants.map((participant) => <li key={participant.id}
            draggable={selected.phase === 'Fight' && !busy}
            onDragStart={(event) => {
              setDraggedId(participant.id)
              setDropIndex(null)
              event.dataTransfer.setData('text/plain', participant.id)
              event.dataTransfer.effectAllowed = 'move'
            }}
            onDragEnd={() => { setDraggedId(null); setDropIndex(null) }}>
            <div className="held-row">{kindBadge(participant)}<strong>{participant.name}</strong>
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
            </div>
            {selected.phase === 'Prepare' && prepareSelectedId === participant.id && hpEditor(participant)}
          </li>)}</ul>}
      </section>
      <section className={selected.phase === 'Prepare' ? 'prepare-active-section' : undefined}
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
          setDraggedId(null)
          void mutate(`${api}/${selected.id}/participants/${sourceId}/activate`, 'POST',
            { revision: selected.revision, targetIndex: 0 }, 'Participant moved to the active list.')
        }}>
        {selected.phase === 'Fight' ? 'No active participants. Drop a held participant here to resume turns.'
          : 'Add a PC, NPC, or mob to prepare the order.'}</div> :
        <ol className={`encounter-participants ${selected.phase === 'Fight' ? 'fight-list' : ''}`}
          onDragOver={(event) => {
            if (selected.phase === 'Fight' && !busy && draggedId) {
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
            <strong>{participant.name}</strong>
            {selected.phase === 'Fight' && <span className="fight-turn-count">Turn: {participant.turnCount}</span>}
          </>
          const marker = selected.phase === 'Fight' && draggedId
            ? dropIndex === index ? 'drop-before'
              : dropIndex === activeParticipants.length && index === activeParticipants.length - 1 ? 'drop-end' : ''
            : ''
          return <li key={participant.id} className={`${active ? 'active' : ''} ${marker} ${participant.status === 'Disabled' ? 'disabled-hp' : participant.status === 'Dying' ? 'dying' : participant.status === 'AliveAdjacent' ? 'alive-adjacent' : ''}`}
            draggable={selected.phase === 'Fight' && !busy}
            tabIndex={selected.phase === 'Fight' ? 0 : undefined}
            aria-keyshortcuts={selected.phase === 'Fight' ? 'Alt+ArrowUp Alt+ArrowDown' : undefined}
            onKeyDown={(event) => {
              if (event.target !== event.currentTarget || !event.altKey || busy) return
              if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
                event.preventDefault()
                moveToIndex(participant.id, index + (event.key === 'ArrowUp' ? -1 : 1))
              }
            }}
            onDragStart={(event) => {
              setDraggedId(participant.id)
              setDropIndex(null)
              event.dataTransfer.setData('text/plain', participant.id)
              event.dataTransfer.effectAllowed = 'move'
            }}
            onDragEnd={() => { setDraggedId(null); setDropIndex(null) }}>
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
              <div className={`fight-tile-heading${inactive ? ' inactive-fight-heading' : ''}`}>
                {inactive ? <div className="fight-participant-summary">{summary}</div> : summary}
                {active && <span className="active-label">Active turn</span>}
                {inactive && fightHpRow(participant)}
                {selected.phase === 'Fight' && <div className="condition-actions">
                  {participant.conditions.map((condition) => <span className="condition-bubble" key={condition.kind}>
                    {condition.kind} · {condition.turnCount}
                    <button type="button" aria-label={`Remove ${condition.kind} from ${participant.name}`}
                      disabled={busy} onClick={() => void setCondition(participant, condition.kind, false)}>×</button>
                  </span>)}
                  <button type="button" disabled={busy || active}
                    onClick={() => void mutate(`${api}/${selected.id}/active`, 'POST',
                      { revision: selected.revision, participantId: participant.id }, 'Active participant changed.')}>
                    Set active
                  </button>
                  <button type="button" disabled={busy}
                    onClick={() => void mutate(`${api}/${selected.id}/participants/${participant.id}/hold`, 'POST',
                      { revision: selected.revision }, 'Participant moved to Hold.')}>Hold</button>
                  <button type="button" className="condition-picker" aria-label={`Manage statuses for ${participant.name}`}
                    disabled={busy} onClick={() => setConditionParticipantId(participant.id)} title="Add a status">✦</button>
                </div>}
              </div>
              {selected.phase === 'Fight' ? active && fightHpRow(participant) : <p className="fight-tile-meta">Turns completed: {participant.turnCount} · HP: {participant.currentHp ?? 'Not set'}
                {participant.status === 'Disabled' && <span className="hp-status disabled-label">Disabled</span>}
                {participant.status === 'Dying' && <span className="hp-status dying-label">Dying</span>}
                {participant.status === 'AliveAdjacent' && <span className="hp-status alive-adjacent-label">alive adjacent</span>}
              </p>}
              {active && <div className="active-turn-controls" role="group" aria-label={`Turn actions for ${participant.name}`}>
                <button type="button" disabled={busy} onClick={() => void mutate(`${api}/${selected.id}/next`, 'POST',
                  { revision: selected.revision }, 'Turn completed.')}>Next</button>
                <button type="button" disabled={busy} onClick={() => void mutate(`${api}/${selected.id}/skip`, 'POST',
                  { revision: selected.revision }, 'Turn skipped.')}>Skip</button>
              </div>}
            </>}
          </li>
        })}</ol>}
      </section>
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
      {selected.phase === 'Fight' && conditionParticipant &&
        <ConditionDialog participant={conditionParticipant}
          busy={busy} onClose={() => setConditionParticipantId(null)}
          onAdd={(kind) => void setCondition(conditionParticipant, kind, true)} />}
    </div>}
  </div>
}

export default EncounterWorkspace
