import { useCallback, useEffect, useRef, useState, type DragEvent, type FormEvent } from 'react'
import { campaignApi } from './runtime'

type Character = { id: string; name: string; kind: 'Pc' | 'Npc' }
type EncounterSummary = { id: string; name: string; phase: 'Prepare' | 'Fight' | 'Finished'; round: number; revision: number }
type ConditionKind = 'Invisible' | 'Grappled' | 'Prone'
const conditionKinds: ConditionKind[] = ['Invisible', 'Grappled', 'Prone']
type Participant = {
  id: string
  characterId: string | null
  name: string
  kind: 'Pc' | 'Npc' | 'Mob'
  initiative: string | null
  currentHp: string | null
  status: 'Disabled' | 'Dying' | 'AliveAdjacent' | null
  conditions: { kind: ConditionKind; turnCount: number }[]
  position: number
  isHeld: boolean
  turnCount: number
}
type EncounterDetail = EncounterSummary & {
  campaignId: string
  activeParticipantId: string | null
  participants: Participant[]
}

async function responseMessage(response: Response): Promise<string> {
  const body = await response.json().catch(() => ({})) as { message?: string }
  return body.message ?? (response.status === 401 ? 'Your session ended. Reload to sign in again.'
    : response.status === 403 ? 'Campaign access is no longer available.'
      : response.status === 404 ? 'This encounter is no longer available.'
        : 'The request could not be completed.')
}

function EncounterWorkspace({ campaignId, characters, selectedId, onSelectId }: {
  campaignId: string; characters: Character[]; selectedId: string | null
  onSelectId: (id: string | null) => void
}) {
  const api = `${campaignApi}/campaigns/${campaignId}/encounters`
  const [encounters, setEncounters] = useState<EncounterSummary[]>([])
  const [selected, setSelected] = useState<EncounterDetail | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dropIndex, setDropIndex] = useState<number | null>(null)
  const [initiativeOpen, setInitiativeOpen] = useState(false)
  const [initiativeStep, setInitiativeStep] = useState(0)
  const [prepareSelectedId, setPrepareSelectedId] = useState<string | null>(null)
  const [conditionParticipantId, setConditionParticipantId] = useState<string | null>(null)
  const initiativeDialog = useRef<HTMLDialogElement>(null)
  const conditionDialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = conditionDialog.current
    if (!dialog) return
    if (conditionParticipantId && !dialog.open) dialog.showModal()
    if (!conditionParticipantId && dialog.open) dialog.close()
  }, [conditionParticipantId])

  useEffect(() => {
    const dialog = initiativeDialog.current
    if (!dialog) return
    if (initiativeOpen && !dialog.open) dialog.showModal()
    if (!initiativeOpen && dialog.open) dialog.close()
  }, [initiativeOpen])

  const loadEncounters = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch(api, { cache: 'no-store', signal })
    if (!response.ok) throw new Error(await responseMessage(response))
    setEncounters(await response.json() as EncounterSummary[])
  }, [api])

  const loadSelected = useCallback(async (id: string, signal?: AbortSignal) => {
    const response = await fetch(`${api}/${id}`, { cache: 'no-store', signal })
    if (!response.ok) throw new Error(await responseMessage(response))
    setSelected(await response.json() as EncounterDetail)
  }, [api])

  useEffect(() => {
    const controller = new AbortController()
    void Promise.resolve().then(() => loadEncounters(controller.signal)).catch((error: unknown) => {
      if (!controller.signal.aborted) setMessage(error instanceof Error ? error.message : 'Could not load encounters.')
    })
    return () => controller.abort()
  }, [loadEncounters])

  useEffect(() => {
    if (!selectedId) return
    const controller = new AbortController()
    void Promise.resolve().then(() => loadSelected(selectedId, controller.signal)).catch((error: unknown) => {
      if (!controller.signal.aborted) {
        setSelected(null)
        setMessage(error instanceof Error ? error.message : 'Could not load the encounter.')
      }
    })
    return () => controller.abort()
  }, [selectedId, characters, loadSelected])

  async function mutate(url: string, method: string, body: object, success: string): Promise<boolean> {
    if (!selected) return false
    setBusy(true)
    setMessage('')
    try {
      const response = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      if (!response.ok) throw new Error(await responseMessage(response))
      const updated = await response.json() as EncounterDetail
      setSelected(updated)
      setEncounters((previous) => previous.map((item) => item.id === updated.id
        ? { id: updated.id, name: updated.name, phase: updated.phase,
          round: updated.round, revision: updated.revision } : item))
      setMessage(success)
      return true
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save the encounter.')
      await loadSelected(selected.id).catch(() => undefined)
      return false
    } finally { setBusy(false) }
  }

  async function createEncounter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const name = String(new FormData(form).get('encounterName') ?? '')
    setBusy(true)
    setMessage('')
    try {
      const response = await fetch(api, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }),
      })
      if (!response.ok) throw new Error(await responseMessage(response))
      const created = await response.json() as EncounterSummary
      form.reset()
      await loadEncounters()
      onSelectId(created.id)
      setMessage('Encounter created in Prepare.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not create the encounter.')
    } finally { setBusy(false) }
  }

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
    if (saved) form.reset()
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
  const reviewedOrder = selected?.phase === 'Prepare' ? [...activeParticipants].sort((left, right) => {
    if (left.initiative === null) return 1
    if (right.initiative === null) return -1
    const first = BigInt(left.initiative)
    const second = BigInt(right.initiative)
    return first === second ? left.position - right.position : first > second ? -1 : 1
  }) : []

  function hpEditor(participant: Participant) {
    if (!selected || selected.phase === 'Finished') return null
    return <div className="hp-controls">
      <form className="hp-field-form" key={`${participant.id}-hp-${participant.currentHp}`} onSubmit={(event) => {
        event.preventDefault()
        const currentHp = new FormData(event.currentTarget).get('currentHp')
        void mutate(`${api}/${selected.id}/participants/${participant.id}/hp`, 'PATCH',
          { revision: selected.revision, currentHp }, 'HP saved.')
      }}>
        <label htmlFor={`hp-${participant.id}`}>Current HP</label>
        <div className="hp-input-line">
          <input id={`hp-${participant.id}`} name="currentHp" defaultValue={participant.currentHp ?? ''}
            inputMode="decimal" />
          <button type="submit" disabled={busy}>Save</button>
        </div>
      </form>
      {selected.phase === 'Fight' && participant.currentHp !== null && <>
        <form className="hp-field-form" onSubmit={(event) => void adjustHp(event, participant.id, 'damage')}>
          <label htmlFor={`damage-${participant.id}`}>Damage amount</label>
          <div className="hp-input-line">
            <input id={`damage-${participant.id}`} name="amount" required inputMode="decimal" />
            <button type="submit" disabled={busy}>Damage</button>
          </div>
        </form>
        <form className="hp-field-form" onSubmit={(event) => void adjustHp(event, participant.id, 'heal')}>
          <label htmlFor={`heal-${participant.id}`}>Heal amount</label>
          <div className="hp-input-line">
            <input id={`heal-${participant.id}`} name="amount" required inputMode="decimal" />
            <button type="submit" disabled={busy}>Heal</button>
          </div>
        </form>
      </>}
    </div>
  }

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
        <button type="button" className={selectedId === encounter.id ? 'selected' : ''}
          disabled={busy} onClick={() => { setSelected(null); onSelectId(encounter.id) }}>
          {encounter.name} <small>{encounter.phase}</small>
        </button>
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
        <h2>{selected.name}</h2>
        {selected.phase === 'Prepare' && <button type="button" disabled={busy || activeParticipants.length === 0}
          onClick={() => { setMessage(''); setInitiativeStep(0); setInitiativeOpen(true) }}>Begin Fight</button>}
      </div>
      <p>Phase: {selected.phase}. {activeParticipants.length} active, {heldParticipants.length} held.
        {selected.phase !== 'Prepare' && <> Round {selected.round}.</>}</p>
      {selected.phase === 'Fight' && <div className="encounter-controls">
        <button type="button" disabled={busy} onClick={() => {
          if (window.confirm('End this encounter? It cannot return to Fight.'))
            void mutate(`${api}/${selected.id}/end`, 'POST',
              { revision: selected.revision }, 'Encounter ended.')
        }}>End encounter</button>
      </div>}
      {selected.phase !== 'Finished' && <div className="add-participant">
        <h3>Add a PC, NPC, or mob</h3>
        <h5>Add a campaign character</h5>
        {selected.phase === 'Prepare' && <button type="button" disabled={busy || available.length === 0}
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
      </div>}
      <section className="held-section" aria-label="Hold list">
        <h5>Hold ({heldParticipants.length})</h5>
        <p>Held participants wait outside the turn order and do not affect Round or Turn counts.
          {selected.phase === 'Fight' && ' Drag one into the turn order to release them.'}</p>
        {heldParticipants.length === 0 ? <p>No participants on Hold.</p> :
          <ul className="held-list">{heldParticipants.map((participant) => <li key={participant.id}
            draggable={selected.phase === 'Fight' && !busy}
            onDragStart={(event) => {
              setDraggedId(participant.id)
              setDropIndex(null)
              event.dataTransfer.setData('text/plain', participant.id)
              event.dataTransfer.effectAllowed = 'move'
            }}
            onDragEnd={() => { setDraggedId(null); setDropIndex(null) }}>
            <div className="held-row"><strong>{participant.name}</strong> <small>{participant.kind.toUpperCase()}</small>
              <span>Turns completed: {participant.turnCount} · HP: {participant.currentHp ?? 'Not set'}</span>
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
      <h5>{selected.phase === 'Prepare' ? `Active (${activeParticipants.length})` : selected.phase === 'Fight' ? 'Turn order' : 'Final order'}</h5>
      {selected.phase === 'Fight' && <p>Drag a participant to the arrow between tiles or at the end. For keyboard reordering, focus a tile and press Alt+Up or Alt+Down. Reordering keeps the current active participant.</p>}
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
                  <strong>{participant.name}</strong> <small>{participant.kind.toUpperCase()}</small>
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
              <div className="fight-tile-heading"><strong>{participant.name}</strong>
                {selected.phase === 'Fight' && <span className="fight-turn-count">Turns completed: {participant.turnCount}</span>}
                <small>{participant.kind.toUpperCase()}</small>
                {active && <span className="active-label">Active turn</span>}
                {selected.phase === 'Fight' && <div className="condition-actions">
                  {participant.conditions.map((condition) => <span className="condition-bubble" key={condition.kind}>
                    {condition.kind} · {condition.turnCount}
                    <button type="button" aria-label={`Remove ${condition.kind} from ${participant.name}`}
                      disabled={busy} onClick={() => void setCondition(participant, condition.kind, false)}>×</button>
                  </span>)}
                  <button type="button" className="condition-picker" aria-label={`Manage statuses for ${participant.name}`}
                    disabled={busy} onClick={() => setConditionParticipantId(participant.id)} title="Add a status">✦</button>
                </div>}
              </div>
              <p className="fight-tile-meta">{selected.phase === 'Finished' && <>Turns completed: {participant.turnCount} · </>}
                HP: {participant.currentHp ?? 'Not set'}
                {participant.status === 'Disabled' && <span className="hp-status disabled-label">Disabled</span>}
                {participant.status === 'Dying' && <span className="hp-status dying-label">Dying</span>}
                {participant.status === 'AliveAdjacent' && <span className="hp-status alive-adjacent-label">alive adjacent</span>}
              </p>
              {active && <div className="active-turn-controls" role="group" aria-label={`Turn actions for ${participant.name}`}>
                <button type="button" disabled={busy} onClick={() => void mutate(`${api}/${selected.id}/next`, 'POST',
                  { revision: selected.revision }, 'Turn completed.')}>Next</button>
                <button type="button" disabled={busy} onClick={() => void mutate(`${api}/${selected.id}/skip`, 'POST',
                  { revision: selected.revision }, 'Turn skipped.')}>Skip</button>
              </div>}
              {selected.phase === 'Fight' && active && <details className="fight-tile-actions" open>
                <summary onClick={(event) => {
                  event.preventDefault()
                }}>actions</summary>
                {hpEditor(participant)}
                <div className="account-actions">
                  <button type="button" disabled={busy || active}
                    onClick={() => void mutate(`${api}/${selected.id}/active`, 'POST',
                      { revision: selected.revision, participantId: participant.id }, 'Active participant changed.')}>
                    Set active
                  </button>
                  <button type="button" disabled={busy}
                    onClick={() => void mutate(`${api}/${selected.id}/participants/${participant.id}/hold`, 'POST',
                      { revision: selected.revision }, 'Participant moved to Hold.')}>Hold</button>
                </div>
              </details>}
              {selected.phase === 'Fight' && !active && <div className="non-active-actions">
                <form className="quick-hp-form" onSubmit={(event) => void adjustHp(event, participant.id)}>
                  <input name="amount" required inputMode="decimal"
                    aria-label={`HP adjustment for ${participant.name}`} />
                  <button type="submit" value="damage" disabled={busy || participant.currentHp === null}>Damage</button>
                  <button type="submit" value="heal" disabled={busy || participant.currentHp === null}>Heal</button>
                </form>
                <div className="account-actions">
                  <button type="button" disabled={busy}
                    onClick={() => void mutate(`${api}/${selected.id}/active`, 'POST',
                      { revision: selected.revision, participantId: participant.id }, 'Active participant changed.')}>
                    Set active
                  </button>
                  <button type="button" disabled={busy}
                    onClick={() => void mutate(`${api}/${selected.id}/participants/${participant.id}/hold`, 'POST',
                      { revision: selected.revision }, 'Participant moved to Hold.')}>Hold</button>
                </div>
              </div>}
            </>}
          </li>
        })}</ol>}
      </section>
      {initiativeOpen && selected.phase === 'Prepare' && <dialog ref={initiativeDialog}
        aria-labelledby="initiative-title" onCancel={(event) => {
          event.preventDefault()
          setInitiativeOpen(false)
        }}>
        <h3 id="initiative-title">Begin Fight: initiative</h3>
        {message && <p role="status">{message}</p>}
        {initiativeStep < activeParticipants.length ? <>
          <p>Participant {initiativeStep + 1} of {activeParticipants.length}</p>
          <form key={activeParticipants[initiativeStep].id} onSubmit={(event) => void savePromptedInitiative(event)}>
            <label>Initiative for {activeParticipants[initiativeStep].name}
              ({activeParticipants[initiativeStep].kind.toUpperCase()})
              <input name="initiative" required autoFocus inputMode="numeric" pattern="[+-]?[0-9]+"
                defaultValue={activeParticipants[initiativeStep].initiative ?? ''} />
            </label>
            <div className="dialog-actions">
              <button type="button" disabled={busy} onClick={() => setInitiativeOpen(false)}>Close and keep progress</button>
              {initiativeStep > 0 && <button type="button" disabled={busy}
                onClick={() => setInitiativeStep((step) => step - 1)}>Previous</button>}
              <button type="submit" disabled={busy}>Save and continue</button>
            </div>
          </form>
        </> : <>
          <p>Review the initial order before starting Fight. Ties keep encounter entry order.</p>
          <ol>{reviewedOrder.map((participant) => <li key={participant.id}>
            {participant.name} ({participant.kind.toUpperCase()}) — {participant.initiative ?? 'Missing'}
          </li>)}</ol>
          <div className="dialog-actions">
            <button type="button" disabled={busy} onClick={() => setInitiativeOpen(false)}>Close and keep progress</button>
            <button type="button" disabled={busy} onClick={() => setInitiativeStep(activeParticipants.length - 1)}>Previous</button>
            <button type="button" disabled={busy || activeParticipants.some((participant) => participant.initiative === null)}
              onClick={() => void mutate(`${api}/${selected.id}/fight`, 'POST',
                { revision: selected.revision }, 'Fight started.').then((saved) => {
                  if (saved) setInitiativeOpen(false)
                })}>Confirm and begin Fight</button>
          </div>
        </>}
      </dialog>}
      {selected.phase === 'Fight' && conditionParticipantId && <dialog ref={conditionDialog}
        aria-labelledby="condition-title" onCancel={(event) => {
          event.preventDefault()
          setConditionParticipantId(null)
        }}>
        <h3 id="condition-title">Statuses for {selected.participants.find((item) => item.id === conditionParticipantId)?.name}</h3>
        <p>Add a status to this participant. Its count starts at 0 and increases only when they use Next.</p>
        <div className="condition-choices">{conditionKinds.map((kind) => {
          const participant = selected.participants.find((item) => item.id === conditionParticipantId)
          if (!participant) return null
          const applied = participant.conditions.some((condition) => condition.kind === kind)
          return <button type="button" key={kind} disabled={busy || applied}
            onClick={() => void setCondition(participant, kind, true)}>{kind}{applied ? ' ✓' : ''}</button>
        })}</div>
        <div className="dialog-actions"><button type="button" onClick={() => setConditionParticipantId(null)}>Done</button></div>
      </dialog>}
    </div>}
  </div>
}

export default EncounterWorkspace
