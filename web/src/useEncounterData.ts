import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { campaignApi } from './runtime'

export type Character = { id: string; name: string; kind: 'Pc' | 'Npc' }
export type EncounterSummary = { id: string; name: string; phase: 'Prepare' | 'Fight' | 'Finished'; round: number; revision: number }
export type ConditionKind = 'Invisible' | 'Grappled' | 'Prone'
export type Participant = {
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
export type EncounterDetail = EncounterSummary & {
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

export default function useEncounterData(campaignId: string, selectedId: string | null,
  characters: readonly Character[], onSelectId: (id: string | null) => void) {
  const api = `${campaignApi}/campaigns/${campaignId}/encounters`
  const [encounters, setEncounters] = useState<EncounterSummary[]>([])
  const [selected, setSelected] = useState<EncounterDetail | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

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

  async function duplicateEncounter(encounterId: string) {
    setBusy(true)
    setMessage('')
    try {
      const response = await fetch(`${api}/${encounterId}/duplicate`, { method: 'POST' })
      if (!response.ok) throw new Error(await responseMessage(response))
      const created = await response.json() as EncounterSummary
      setEncounters((previous) => [...previous, created]
        .sort((left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id)))
      onSelectId(created.id)
      setMessage('Encounter duplicated in Prepare.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not duplicate the encounter.')
    } finally { setBusy(false) }
  }

  return { api, encounters, selected, setSelected, busy, message, setMessage, mutate, createEncounter, duplicateEncounter }
}
