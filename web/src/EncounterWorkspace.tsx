import { useCallback, useEffect, useState, type DragEvent, type FormEvent } from 'react'
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

function EncounterWorkspace({ campaignId, characters }: { campaignId: string; characters: Character[] }) {
  const api = `${campaignApi}/campaigns/${campaignId}/encounters`
  const [encounters, setEncounters] = useState<EncounterSummary[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selected, setSelected] = useState<EncounterDetail | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<string | null>(null)

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
      setSelectedId(created.id)
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

  function dropOn(event: DragEvent<HTMLLIElement>, targetId: string) {
    event.preventDefault()
    setDropTarget(null)
    const sourceId = draggedId ?? event.dataTransfer.getData('text/plain')
    setDraggedId(null)
    if (!selected || !sourceId || sourceId === targetId) return
    const sourceIndex = selected.participants.findIndex((participant) => participant.id === sourceId)
    const targetIndex = selected.participants.findIndex((participant) => participant.id === targetId)
    if (sourceIndex < 0 || targetIndex < 0) return
    const halfway = event.currentTarget.getBoundingClientRect().top + event.currentTarget.offsetHeight / 2
    const insertBefore = event.clientY < halfway
    const insertionIndex = targetIndex + (insertBefore ? 0 : 1)
    moveToIndex(sourceId, insertionIndex > sourceIndex ? insertionIndex - 1 : insertionIndex)
  }

  const available = characters.filter((character) =>
    !selected?.participants.some((participant) => participant.characterId === character.id))

  return <div className="encounter-workspace">
    <h4>Encounters</h4>
    <p>Prepare and run encounters here. Changes save as you make them.</p>
    {message && <p className="account-message" role="status">{message}</p>}
    <form onSubmit={(event) => void createEncounter(event)}>
      <label>Encounter name<input name="encounterName" required /></label>
      <button type="submit" disabled={busy}>Create encounter</button>
    </form>
    {encounters.length === 0 ? <p>No encounters yet.</p> : <ul className="encounter-list">
      {encounters.map((encounter) => <li key={encounter.id}>
        <button type="button" className={selectedId === encounter.id ? 'selected' : ''}
          disabled={busy} onClick={() => { setSelected(null); setSelectedId(encounter.id) }}>
          {encounter.name} <small>{encounter.phase}</small>
        </button>
      </li>)}
    </ul>}
    {selected && <div className="encounter-detail">
      <h4>{selected.name}</h4>
      <p>Phase: {selected.phase}. {selected.participants.length} participant{selected.participants.length === 1 ? '' : 's'}.
        {selected.phase !== 'Prepare' && <> Round {selected.round}.</>}</p>
      {selected.phase === 'Fight' && <div className="encounter-controls">
        <button type="button" disabled={busy} onClick={() => void mutate(`${api}/${selected.id}/next`, 'POST',
          { revision: selected.revision }, 'Turn completed.')}>Next</button>
        <button type="button" disabled={busy} onClick={() => void mutate(`${api}/${selected.id}/skip`, 'POST',
          { revision: selected.revision }, 'Turn skipped.')}>Skip</button>
        <button type="button" disabled={busy} onClick={() => {
          if (window.confirm('End this encounter? It cannot return to Fight.'))
            void mutate(`${api}/${selected.id}/end`, 'POST',
              { revision: selected.revision }, 'Encounter ended.')
        }}>End encounter</button>
      </div>}
      {selected.phase !== 'Finished' && <>
        <h5>Add a campaign character</h5>
        {available.length === 0 ? <p>No available PCs or NPCs in this campaign.</p> :
          <form onSubmit={(event) => void addParticipant(event)}>
            <input type="hidden" name="participantType" value="character" />
            <label>PC or NPC<select name="characterId" required>
              {available.map((character) => <option key={character.id} value={character.id}>
                {character.name} ({character.kind.toUpperCase()})
              </option>)}
            </select></label>
            {selected.phase === 'Prepare' && <label>Initiative (can be entered later)<input name="initiative" inputMode="numeric" pattern="[+-]?[0-9]+" /></label>}
            <label>Starting HP (optional)<input name="currentHp" inputMode="decimal" /></label>
            <button type="submit" disabled={busy}>Add character</button>
          </form>}
        <h5>Add an encounter-only mob</h5>
        <form onSubmit={(event) => void addParticipant(event)}>
          <input type="hidden" name="participantType" value="mob" />
          <label>Mob name<input name="mobName" required /></label>
          {selected.phase === 'Prepare' && <label>Initiative (can be entered later)<input name="initiative" inputMode="numeric" pattern="[+-]?[0-9]+" /></label>}
          <label>Starting HP (optional)<input name="currentHp" inputMode="decimal" /></label>
          <button type="submit" disabled={busy}>Add mob</button>
        </form>
      </>}
      {selected.phase === 'Prepare' && <div className="encounter-controls">
        <button type="button" disabled={busy || selected.participants.length === 0
          || selected.participants.some((participant) => participant.initiative === null)}
          onClick={() => void mutate(`${api}/${selected.id}/fight`, 'POST',
            { revision: selected.revision }, 'Fight started.')}>Begin Fight</button>
        {selected.participants.length > 0 && selected.participants.some((participant) => participant.initiative === null)
          && <p>Enter initiative for every participant before beginning Fight.</p>}
      </div>}
      <h5>{selected.phase === 'Prepare' ? 'Initial order' : selected.phase === 'Fight' ? 'Turn order' : 'Final order'}</h5>
      {selected.phase === 'Fight' && <p>Drag a participant to reorder, or use Move up and Move down. A move makes the participant who followed the active one before the move active.</p>}
      {selected.participants.length === 0 ? <p>Add a PC, NPC, or mob to prepare the order.</p> :
        <ol className="encounter-participants">{selected.participants.map((participant, index) => {
          const previous = selected.participants[index - 1]
          const next = selected.participants[index + 1]
          const active = selected.phase === 'Fight' && selected.activeParticipantId === participant.id
          return <li key={participant.id} className={`${active ? 'active' : ''} ${dropTarget === participant.id ? 'drop-target' : ''} ${participant.status === 'Unconscious' ? 'unconscious' : participant.status === 'AliveAdjacent' ? 'alive-adjacent' : ''}`}
            draggable={selected.phase === 'Fight' && !busy}
            onDragStart={(event) => {
              setDraggedId(participant.id)
              event.dataTransfer.setData('text/plain', participant.id)
              event.dataTransfer.effectAllowed = 'move'
            }}
            onDragEnd={() => { setDraggedId(null); setDropTarget(null) }}
            onDragOver={(event) => {
              if (selected.phase === 'Fight' && !busy) {
                event.preventDefault()
                setDropTarget(participant.id)
              }
            }}
            onDrop={(event) => dropOn(event, participant.id)}>
            <div><strong>{participant.name}</strong> <small>{participant.kind.toUpperCase()}</small>
              {active && <span className="active-label">Active turn</span>}
            </div>
            <p>HP: {participant.currentHp ?? 'Not set'}
              {participant.status === 'Unconscious' && <span className="hp-status unconscious-label">Unconscious</span>}
              {participant.status === 'AliveAdjacent' && <span className="hp-status alive-adjacent-label">alive adjacent</span>}
            </p>
            {selected.phase !== 'Finished' && <div className="hp-controls">
              <form key={`${participant.id}-hp-${participant.currentHp}`} onSubmit={(event) => {
                event.preventDefault()
                const currentHp = new FormData(event.currentTarget).get('currentHp')
                void mutate(`${api}/${selected.id}/participants/${participant.id}/hp`, 'PATCH',
                  { revision: selected.revision, currentHp }, 'HP saved.')
              }}>
                <label>Current HP<input name="currentHp" defaultValue={participant.currentHp ?? ''}
                  inputMode="decimal" /></label>
                <button type="submit" disabled={busy}>Save HP</button>
              </form>
              {participant.currentHp !== null && <>
                <form onSubmit={(event) => void adjustHp(event, participant.id, 'damage')}>
                  <label>Damage amount<input name="amount" required inputMode="decimal" /></label>
                  <button type="submit" disabled={busy}>Damage</button>
                </form>
                <form onSubmit={(event) => void adjustHp(event, participant.id, 'heal')}>
                  <label>Heal amount<input name="amount" required inputMode="decimal" /></label>
                  <button type="submit" disabled={busy}>Heal</button>
                </form>
              </>}
            </div>}
            {selected.phase === 'Prepare' ? <>
              <form key={`${participant.id}-${participant.initiative}`} onSubmit={(event) => {
                event.preventDefault()
                const value = new FormData(event.currentTarget).get('initiative')
                void mutate(`${api}/${selected.id}/participants/${participant.id}/initiative`, 'PATCH',
                  { revision: selected.revision, initiative: value }, 'Initiative saved.')
              }}>
                <label>Initiative<input name="initiative" defaultValue={participant.initiative ?? ''}
                  inputMode="numeric" pattern="[+-]?[0-9]+" /></label>
                <button type="submit" disabled={busy}>Save</button>
              </form>
              <div className="account-actions">
                <button type="button" disabled={busy || !previous || !participant.initiative || previous.initiative !== participant.initiative}
                  onClick={() => void mutate(`${api}/${selected.id}/participants/${participant.id}/move-tie`, 'POST',
                    { revision: selected.revision, direction: 'up' }, 'Tie order changed.')}>Move up</button>
                <button type="button" disabled={busy || !next || !participant.initiative || next.initiative !== participant.initiative}
                  onClick={() => void mutate(`${api}/${selected.id}/participants/${participant.id}/move-tie`, 'POST',
                    { revision: selected.revision, direction: 'down' }, 'Tie order changed.')}>Move down</button>
                <button type="button" disabled={busy} onClick={() => void mutate(
                  `${api}/${selected.id}/participants/${participant.id}/remove`, 'POST',
                  { revision: selected.revision }, 'Participant removed.')}>Remove</button>
              </div>
            </> : <>
              <p>Initiative: {participant.initiative ?? '—'} · Turns completed: {participant.turnCount}</p>
              {selected.phase === 'Fight' && <div className="account-actions">
                <button type="button" disabled={busy || index === 0}
                  onClick={() => moveToIndex(participant.id, index - 1)}>Move up</button>
                <button type="button" disabled={busy || index === selected.participants.length - 1}
                  onClick={() => moveToIndex(participant.id, index + 1)}>Move down</button>
                <button type="button" disabled={busy || active}
                  onClick={() => void mutate(`${api}/${selected.id}/active`, 'POST',
                    { revision: selected.revision, participantId: participant.id }, 'Active participant changed.')}>
                  Set active
                </button>
              </div>}
            </>}
          </li>
        })}</ol>}
    </div>}
  </div>
}

export default EncounterWorkspace
