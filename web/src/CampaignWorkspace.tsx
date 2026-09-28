import { useCallback, useEffect, useState, type FormEvent } from 'react'
import EncounterWorkspace from './EncounterWorkspace'
import { campaignApi } from './runtime'

type CampaignSummary = { id: string; name: string; createdAtUtc: string }
type Character = { id: string; name: string; kind: 'Pc' | 'Npc' }
type CampaignDetail = CampaignSummary & { characters: Character[] }

const api = `${campaignApi}/campaigns`

async function responseMessage(response: Response): Promise<string> {
  const body = await response.json().catch(() => ({})) as { message?: string }
  return body.message ?? (response.status === 401 ? 'Your session ended. Reload this page to sign in again.'
    : response.status === 403 ? 'Campaign access is no longer available.'
      : response.status === 404 ? 'This campaign is no longer available.'
        : 'The request could not be completed.')
}

function CampaignWorkspace({ onEncounterOpenChange }: { onEncounterOpenChange: (open: boolean) => void }) {
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [encounterId, setEncounterId] = useState<string | null>(null)
  const [selected, setSelected] = useState<CampaignDetail | null>(null)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    onEncounterOpenChange(encounterId !== null)
    return () => onEncounterOpenChange(false)
  }, [encounterId, onEncounterOpenChange])

  const loadCampaigns = useCallback(async () => {
    try {
      const response = await fetch(api, { cache: 'no-store' })
      if (!response.ok) throw new Error(await responseMessage(response))
      setCampaigns(await response.json() as CampaignSummary[])
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not load campaigns.')
    } finally { setLoading(false) }
  }, [])

  const loadSelected = useCallback(async (id: string, signal?: AbortSignal) => {
    try {
      const response = await fetch(`${api}/${id}`, { cache: 'no-store', signal })
      if (!response.ok) throw new Error(await responseMessage(response))
      setSelected(await response.json() as CampaignDetail)
    } catch (error) {
      if (signal?.aborted) return
      setSelected(null)
      setMessage(error instanceof Error ? error.message : 'Could not load the campaign.')
    }
  }, [])

  useEffect(() => {
    let active = true
    void Promise.resolve().then(() => { if (active) return loadCampaigns() })
    return () => { active = false }
  }, [loadCampaigns])

  useEffect(() => {
    let active = true
    const controller = new AbortController()
    void Promise.resolve().then(() => { if (active && selectedId) return loadSelected(selectedId, controller.signal) })
    return () => { active = false; controller.abort() }
  }, [selectedId, loadSelected])

  async function createCampaign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const name = String(new FormData(form).get('campaignName') ?? '')
    setBusy(true)
    setMessage('')
    try {
      const response = await fetch(api, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }),
      })
      if (!response.ok) throw new Error(await responseMessage(response))
      const created = await response.json() as CampaignSummary
      form.reset()
      await loadCampaigns()
      setSelected(null)
      setSelectedId(created.id)
      setMessage('Campaign created.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not create the campaign.')
    } finally { setBusy(false) }
  }

  async function addCharacter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedId) return
    const form = event.currentTarget
    const values = new FormData(form)
    setBusy(true)
    setMessage('')
    try {
      const response = await fetch(`${api}/${selectedId}/characters`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: values.get('characterName'), kind: values.get('kind') }),
      })
      if (!response.ok) throw new Error(await responseMessage(response))
      form.reset()
      await loadSelected(selectedId)
      setMessage('Character added.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not add the character.')
    } finally { setBusy(false) }
  }

  async function changeKind(character: Character) {
    if (!selectedId) return
    setBusy(true)
    setMessage('')
    try {
      const response = await fetch(`${api}/${selectedId}/characters/${character.id}/kind`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: character.kind === 'Pc' ? 'Npc' : 'Pc' }),
      })
      if (!response.ok) throw new Error(await responseMessage(response))
      await loadSelected(selectedId)
      setMessage('Character classification changed.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not change the character.')
    } finally { setBusy(false) }
  }

  async function removeCharacter(character: Character) {
    if (!selectedId || !window.confirm(`Remove ${character.name} from this campaign?`)) return
    setBusy(true)
    setMessage('')
    try {
      const response = await fetch(`${api}/${selectedId}/characters/${character.id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error(await responseMessage(response))
      await loadSelected(selectedId)
      setMessage('Character removed.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not remove the character.')
    } finally { setBusy(false) }
  }

  function characterList(kind: Character['kind'], title: string) {
    const entries = selected?.characters.filter((character) => character.kind === kind) ?? []
    return <div className="character-list">
      <h4>{title}</h4>
      {entries.length === 0 ? <p>No {title.toLowerCase()} yet.</p> : <ul className="account-list">
        {entries.map((character) => <li key={character.id}>
          <span>{character.name}</span>
          <span className="account-actions">
            <button type="button" disabled={busy} onClick={() => void changeKind(character)}>
              Make {kind === 'Pc' ? 'NPC' : 'PC'}
            </button>
            <button type="button" disabled={busy} onClick={() => void removeCharacter(character)}>Remove</button>
          </span>
        </li>)}
      </ul>}
    </div>
  }

  if (encounterId) return <section className="encounter-page" aria-label="Encounter">
    <button type="button" className="back-link" onClick={() => setEncounterId(null)}>← Back to campaign</button>
    {selected ? <EncounterWorkspace key={selected.id} campaignId={selected.id}
      characters={selected.characters} selectedId={encounterId} onSelectId={setEncounterId} />
      : <p>Loading campaign…</p>}
  </section>

  return <section className="account-section" aria-labelledby="campaigns-heading">
    <div className="section-heading"><div>
      <p className="eyebrow">Your stories</p>
      <h2 id="campaigns-heading">Campaigns</h2>
    </div></div>
    {message && <p className="account-message" role="status">{message}</p>}
    <div className="campaign-grid">
      <div className="account-card">
        <h3>Start a campaign</h3>
        <form onSubmit={(event) => void createCampaign(event)}>
          <label>Campaign name<input name="campaignName" required /></label>
          <button type="submit" disabled={busy}>Create campaign</button>
        </form>
        <h3 className="campaign-list-heading">Your campaigns</h3>
        {loading ? <p>Loading campaigns…</p> : campaigns.length === 0 ? <p>No campaigns yet.</p> :
          <ul className="campaign-list">{campaigns.map((campaign) => <li key={campaign.id}>
            <button className={selectedId === campaign.id ? 'selected' : ''} type="button" disabled={busy}
              onClick={() => { setSelected(null); setSelectedId(campaign.id); setEncounterId(null) }}>
              <strong>{campaign.name}</strong>
              <small>Created {new Date(campaign.createdAtUtc).toLocaleDateString()}</small>
            </button>
          </li>)}</ul>}
      </div>
      <div className="account-card">
        {!selected ? <><h3>Choose a campaign</h3><p>Select a campaign to manage its PCs and NPCs.</p></> : <>
          <h3>{selected.name}</h3>
          <p>Created {new Date(selected.createdAtUtc).toLocaleDateString()}</p>
          <form onSubmit={(event) => void addCharacter(event)}>
            <label>Character name<input name="characterName" required /></label>
            <label>Type<select name="kind"><option value="Pc">PC</option><option value="Npc">NPC</option></select></label>
            <button type="submit" disabled={busy}>Add character</button>
          </form>
          {characterList('Pc', 'PCs')}
          {characterList('Npc', 'NPCs')}
          <EncounterWorkspace key={selected.id} campaignId={selected.id}
            characters={selected.characters} selectedId={null} onSelectId={setEncounterId} />
        </>}
      </div>
    </div>
  </section>
}

export default CampaignWorkspace
