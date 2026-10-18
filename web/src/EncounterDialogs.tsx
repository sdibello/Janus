import { useEffect, useRef, type FormEvent, type ReactNode } from 'react'
import type { Participant } from './useEncounterData'

function DialogShell({ titleId, className, onClose, children }: {
  titleId: string; className?: string; onClose: () => void; children: ReactNode
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
    return () => { if (dialog?.open) dialog.close() }
  }, [])
  return <dialog ref={dialogRef} className={className} aria-labelledby={titleId}
    onCancel={(event) => { event.preventDefault(); onClose() }}>{children}</dialog>
}

export function AddParticipantDialog({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  return <DialogShell titleId="add-participant-title" className="add-participant-lightbox"
    onClose={onClose}>{children}</DialogShell>
}

export function InitiativeDialog({ participants, step, setStep, message, busy, onSave, onConfirm, onClose }: {
  participants: Participant[]; step: number; setStep: (step: number) => void
  message: string; busy: boolean; onSave: (event: FormEvent<HTMLFormElement>) => void
  onConfirm: () => void; onClose: () => void
}) {
  const reviewedOrder = [...participants].sort((left, right) => {
    if (left.initiative === null) return 1
    if (right.initiative === null) return -1
    const first = BigInt(left.initiative)
    const second = BigInt(right.initiative)
    return first === second ? left.position - right.position : first > second ? -1 : 1
  })
  return <DialogShell titleId="initiative-title" onClose={onClose}>
    <h3 id="initiative-title">Begin Fight: initiative</h3>
    {message && <p role="status">{message}</p>}
    {step < participants.length ? <>
      <p>Participant {step + 1} of {participants.length}</p>
      <form key={participants[step].id} onSubmit={onSave}>
        <label>Initiative for {participants[step].name}
          ({participants[step].kind.toUpperCase()})
          <input name="initiative" required autoFocus inputMode="numeric" pattern="[+-]?[0-9]+"
            defaultValue={participants[step].initiative ?? ''} />
        </label>
        <div className="dialog-actions">
          <button type="button" disabled={busy} onClick={onClose}>Close and keep progress</button>
          {step > 0 && <button type="button" disabled={busy}
            onClick={() => setStep(step - 1)}>Previous</button>}
          <button type="submit" disabled={busy}>Save and continue</button>
        </div>
      </form>
    </> : <>
      <p>Review the initial order before starting Fight. Ties keep encounter entry order.</p>
      <ol>{reviewedOrder.map((participant) => <li key={participant.id}>
        {participant.name} ({participant.kind.toUpperCase()}) — {participant.initiative ?? 'Missing'}
      </li>)}</ol>
      <div className="dialog-actions">
        <button type="button" disabled={busy} onClick={onClose}>Close and keep progress</button>
        <button type="button" disabled={busy} onClick={() => setStep(participants.length - 1)}>Previous</button>
        <button type="button" disabled={busy || participants.some((participant) => participant.initiative === null)}
          onClick={onConfirm}>Confirm and begin Fight</button>
      </div>
    </>}
  </DialogShell>
}
