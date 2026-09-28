import { useCallback, useEffect, useRef, useState, type DragEvent, type FormEvent } from 'react'
import { campaignApi } from './runtime'

type Character = { id: string; name: string; kind: 'Pc' | 'Npc' }
type EncounterSummary = { id: string; name: string; phase: 'Prepare' | 'Fight' | 'Finished'; round: number; revision: number }
type Participant = {
  id: string
  characterId: string | null
  name: string
  kind: 'Pc' | 'Npc' | 'Mob'
  initiative: string | null
  currentHp: string | null
  status: 'Unconscious' | 'AliveAdjacent' | null
  position: number
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
  const initiativeDialog = useRef<HTMLDialogElement>(null)

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
    }, 'Participant added.')
    if (saved) form.reset()
  }

  async function savePromptedInitiative(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selected) return
    const participant = selected.participants[initiativeStep]
    if (!participant) return
    const initiative = new FormData(event.currentTarget).get('initiative')
    const saved = await mutate(`${api}/${selected.id}/participants/${participant.id}/initiative`, 'PATCH',
      { revision: selected.revision, initiative }, 'Initiative saved.')
    if (saved) setInitiativeStep((step) => step + 1)
  }

  async function adjustHp(event: FormEvent<HTMLFormElement>, participantId: string, action: 'damage' | 'heal') {
    event.preventDefault()
    if (!selected) return
    const form = event.currentTarget
    const amount = new FormData(form).get('amount')
    const saved = await mutate(`${api}/${selected.id}/participants/${participantId}/${action}`, 'POST',
      { revision: selected.revision, amount }, action === 'damage' ? 'Damage applied.' : 'Healing applied.')
    if (saved) form.reset()
  }

  function moveToIndex(participantId: string, targetIndex: number) {
    if (!selected || selected.phase !== 'Fight' || busy) return
    const order = selected.participants.map((participant) => participant.id)
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
    const sourceIndex = selected.participants.findIndex((participant) => participant.id === sourceId)
    const insertionIndex = insertionIndexAt(event.currentTarget, event.clientY)
    setDropIndex(null)
    setDraggedId(null)
    if (sourceIndex < 0) return
    moveToIndex(sourceId, insertionIndex > sourceIndex ? insertionIndex - 1 : insertionIndex)
  }

  const available = characters.filter((character) =>
    !selected?.participants.some((participant) => participant.characterId === character.id))
  const reviewedOrder = selected?.phase === 'Prepare' ? [...selected.participants].sort((left, right) => {
    if (left.initiative === null) return 1
    if (right.initiative === null) return -1
    const first = BigInt(left.initiative)
    const second = BigInt(right.initiative)
    return first === second ? left.position - right.position : first > second ? -1 : 1
  }) : []

  function hpEditor(participant: Participant) {
    if (!selected || selected.phase === 'Finished') return null
    return <div className="hp-controls">
      <form className="hp-set-form" key={`${participant.id}-hp-${participant.currentHp}`} onSubmit={(event) => {
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
        <form onSubmit={(event) => void adjustHp(event, participant.id, 'damage')}>
          <label>Damage amount<input name="amount" required inputMode="decimal" /></label>
          <button type="submit" disabled={busy}>Damage</button>
        </form>
        <form onSubmit={(event) => void adjustHp(event, participant.id, 'heal')}>
          <label>Heal amount<input name="amount" required inputMode="decimal" /></label>
          <button type="submit" disabled={busy}>Heal</button>
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
    {encounters.length === 0 ? <p>No encounters yet.</p> : <ul className="encounter-list">
      {encounters.map((encounter) => <li key={encounter.id}>
        <button type="button" className={selectedId === encounter.id ? 'selected' : ''}
          disabled={busy} onClick={() => { setSelected(null); onSelectId(encounter.id) }}>
          {encounter.name} <small>{encounter.phase}</small>
        </button>
      </li>)}
    </ul>}
    </>}
    {selectedId && !selected && <p>Loading encounter…</p>}
    {selectedId && selected && <div className="encounter-detail">
      <div className="encounter-heading">
        <h2>{selected.name}</h2>
        {selected.phase === 'Prepare' && <button type="button" disabled={busy || selected.participants.length === 0}
          onClick={() => { setMessage(''); setInitiativeStep(0); setInitiativeOpen(true) }}>Begin Fight</button>}
      </div>
      <p>Phase: {selected.phase}. {selected.participants.length} participant{selected.participants.length === 1 ? '' : 's'}.
        {selected.phase !== 'Prepare' && <> Round {selected.round}.</>}</p>
      {selected.phase === 'Fight' && <div className="encounter-controls">
        <button type="button" disabled={busy} onClick={() => {
          if (window.confirm('End this encounter? It cannot return to Fight.'))
            void mutate(`${api}/${selected.id}/end`, 'POST',
              { revision: selected.revision }, 'Encounter ended.')
        }}>End encounter</button>
      </div>}
      {selected.phase !== 'Finished' && <details className="add-participant" open={selected.phase === 'Prepare'}>
        <summary>Add a PC, NPC, or mob</summary>
        <h5>Add a campaign character</h5>
        {available.length === 0 ? <p>No available PCs or NPCs in this campaign.</p> :
          <form onSubmit={(event) => void addParticipant(event)}>
            <input type="hidden" name="participantType" value="character" />
            <label>PC or NPC<select name="characterId" required>
              {available.map((character) => <option key={character.id} value={character.id}>
                {character.name} ({character.kind.toUpperCase()})
              </option>)}
            </select></label>
            <label>Starting HP (optional)<input name="currentHp" inputMode="decimal" /></label>
            <button type="submit" disabled={busy}>Add character</button>
          </form>}
        <h5>Add an encounter-only mob</h5>
        <form onSubmit={(event) => void addParticipant(event)}>
          <input type="hidden" name="participantType" value="mob" />
          <label>Mob name<input name="mobName" required /></label>
          <label>Starting HP (optional)<input name="currentHp" inputMode="decimal" /></label>
          <button type="submit" disabled={busy}>Add mob</button>
        </form>
      </details>}
      <h5>{selected.phase === 'Prepare' ? 'Participants' : selected.phase === 'Fight' ? 'Turn order' : 'Final order'}</h5>
      {selected.phase === 'Fight' && <p>Drag a participant to the arrow between tiles or at the end. For keyboard reordering, focus a tile and press Alt+Up or Alt+Down. Reordering keeps the current active participant.</p>}
      {selected.participants.length === 0 ? <p>Add a PC, NPC, or mob to prepare the order.</p> :
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
          onDrop={dropOnList}>{selected.participants.map((participant, index) => {
          const active = selected.phase === 'Fight' && selected.activeParticipantId === participant.id
          const marker = selected.phase === 'Fight' && draggedId
            ? dropIndex === index ? 'drop-before'
              : dropIndex === selected.participants.length && index === selected.participants.length - 1 ? 'drop-end' : ''
            : ''
          return <li key={participant.id} className={`${active ? 'active' : ''} ${marker} ${participant.status === 'Unconscious' ? 'unconscious' : participant.status === 'AliveAdjacent' ? 'alive-adjacent' : ''}`}
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
            {selected.phase === 'Prepare' ? <details className="prepare-row">
              <summary><strong>{participant.name}</strong> <small>{participant.kind.toUpperCase()}</small>
                <span>HP: {participant.currentHp ?? 'Not set'}</span>
                {participant.status && <span className="hp-status">{participant.status === 'AliveAdjacent' ? 'alive adjacent' : 'Unconscious'}</span>}
              </summary>
              {hpEditor(participant)}
              <button type="button" disabled={busy} onClick={() => void mutate(
                `${api}/${selected.id}/participants/${participant.id}/remove`, 'POST',
                { revision: selected.revision }, 'Participant removed.')}>Remove from encounter</button>
            </details> : <>
              <div className="fight-tile-heading"><strong>{participant.name}</strong>
                <small>{participant.kind.toUpperCase()}</small>
                {active && <span className="active-label">Active turn</span>}
              </div>
              <p className="fight-tile-meta">Initiative: {participant.initiative ?? '—'} · Turns completed: {participant.turnCount}
                · HP: {participant.currentHp ?? 'Not set'}
                {participant.status === 'Unconscious' && <span className="hp-status unconscious-label">Unconscious</span>}
                {participant.status === 'AliveAdjacent' && <span className="hp-status alive-adjacent-label">alive adjacent</span>}
              </p>
              {active && <div className="active-turn-controls" role="group" aria-label={`Turn actions for ${participant.name}`}>
                <button type="button" disabled={busy} onClick={() => void mutate(`${api}/${selected.id}/next`, 'POST',
                  { revision: selected.revision }, 'Turn completed.')}>Next</button>
                <button type="button" disabled={busy} onClick={() => void mutate(`${api}/${selected.id}/skip`, 'POST',
                  { revision: selected.revision }, 'Turn skipped.')}>Skip</button>
              </div>}
              {selected.phase === 'Fight' && <details className="fight-tile-actions">
                <summary>Manage {participant.name}</summary>
                {hpEditor(participant)}
                <div className="account-actions">
                  <button type="button" disabled={busy || active}
                    onClick={() => void mutate(`${api}/${selected.id}/active`, 'POST',
                      { revision: selected.revision, participantId: participant.id }, 'Active participant changed.')}>
                    Set active
                  </button>
                </div>
              </details>}
            </>}
          </li>
        })}</ol>}
      {initiativeOpen && selected.phase === 'Prepare' && <dialog ref={initiativeDialog}
        aria-labelledby="initiative-title" onCancel={(event) => {
          event.preventDefault()
          setInitiativeOpen(false)
        }}>
        <h3 id="initiative-title">Begin Fight: initiative</h3>
        {message && <p role="status">{message}</p>}
        {initiativeStep < selected.participants.length ? <>
          <p>Participant {initiativeStep + 1} of {selected.participants.length}</p>
          <form key={selected.participants[initiativeStep].id} onSubmit={(event) => void savePromptedInitiative(event)}>
            <label>Initiative for {selected.participants[initiativeStep].name}
              ({selected.participants[initiativeStep].kind.toUpperCase()})
              <input name="initiative" required autoFocus inputMode="numeric" pattern="[+-]?[0-9]+"
                defaultValue={selected.participants[initiativeStep].initiative ?? ''} />
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
            <button type="button" disabled={busy} onClick={() => setInitiativeStep(selected.participants.length - 1)}>Previous</button>
            <button type="button" disabled={busy || selected.participants.some((participant) => participant.initiative === null)}
              onClick={() => void mutate(`${api}/${selected.id}/fight`, 'POST',
                { revision: selected.revision }, 'Fight started.').then((saved) => {
                  if (saved) setInitiativeOpen(false)
                })}>Confirm and begin Fight</button>
          </div>
        </>}
      </dialog>}
    </div>}
  </div>
}

export default EncounterWorkspace
