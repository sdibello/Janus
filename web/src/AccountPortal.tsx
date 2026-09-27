import { useCallback, useEffect, useState, type FormEvent } from 'react'

type Account = {
  id: string
  userName: string
  email: string
  products: string[]
  isSharedAdministrator: boolean
}

type MailMessage = {
  recipient: string
  subject: string
  actionUrl: string
  createdAtUtc: string
}

const api = '/api/identity'
const query = new URLSearchParams(window.location.search)
const invitation = query.get('invite') ?? ''
const verifyUser = query.get('verifyUser') ?? ''
const verifyToken = query.get('verifyToken') ?? ''

async function post(path: string, body: object): Promise<{ ok: boolean; message: string; data?: { url?: string } }> {
  try {
    const response = await fetch(`${api}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await response.json().catch(() => ({})) as { message?: string; url?: string }
    return {
      ok: response.ok,
      message: data.message ?? (response.status === 401 ? 'Sign-in failed. Check your credentials and email verification.' : 'The request could not be completed.'),
      data,
    }
  } catch {
    return { ok: false, message: 'The identity service is unavailable.' }
  }
}

function AccountPortal() {
  const [account, setAccount] = useState<Account | null>(null)
  const [inbox, setInbox] = useState<MailMessage[]>([])
  const [message, setMessage] = useState('')
  const [invitationUrl, setInvitationUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [verificationPending, setVerificationPending] = useState(Boolean(verifyUser && verifyToken))
  const [registrationComplete, setRegistrationComplete] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const [meResponse, inboxResponse] = await Promise.all([
        fetch(`${api}/account/me`, { cache: 'no-store' }),
        fetch(`${api}/dev/inbox`, { cache: 'no-store' }),
      ])
      setAccount(meResponse.ok ? await meResponse.json() as Account : null)
      if (inboxResponse.ok) setInbox(await inboxResponse.json() as MailMessage[])
    } catch {
      setMessage('The identity service is unavailable.')
    }
  }, [])

  useEffect(() => {
    let active = true
    void Promise.all([
      fetch(`${api}/account/me`, { cache: 'no-store' }),
      fetch(`${api}/dev/inbox`, { cache: 'no-store' }),
    ]).then(async ([meResponse, inboxResponse]) => {
      const currentAccount = meResponse.ok ? await meResponse.json() as Account : null
      const messages = inboxResponse.ok ? await inboxResponse.json() as MailMessage[] : []
      if (active) {
        setAccount(currentAccount)
        setInbox(messages)
      }
    }).catch(() => { if (active) setMessage('The identity service is unavailable.') })
    return () => { active = false }
  }, [])

  async function handleVerify() {
    setBusy(true)
    const result = await post('/account/verify-email', { userId: verifyUser, token: verifyToken })
    setMessage(result.message)
    if (result.ok) {
      window.history.replaceState({}, '', '/portal.html')
      setVerificationPending(false)
      await refresh()
    }
    setBusy(false)
  }

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    const values = new FormData(event.currentTarget)
    const result = await post('/account/register', {
      invitation,
      userName: values.get('userName'),
      email: values.get('email'),
      password: values.get('password'),
    })
    setMessage(result.message)
    if (result.ok) {
      setRegistrationComplete(true)
      await refresh()
    }
    setBusy(false)
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    const values = new FormData(event.currentTarget)
    const result = await post('/account/login', {
      identifier: values.get('identifier'),
      password: values.get('password'),
      rememberMe: values.get('rememberMe') === 'on',
    })
    setMessage(result.message)
    if (result.ok) await refresh()
    setBusy(false)
  }

  async function handleInvite() {
    setBusy(true)
    const result = await post('/admin/invitations', { productId: 'janus-campaigns' })
    setMessage(result.ok ? 'Invitation created. Share this link with the person you want to invite.' : result.message)
    setInvitationUrl(result.data?.url ?? '')
    setBusy(false)
  }

  async function handleLogout() {
    setBusy(true)
    const result = await post('/account/logout', {})
    setMessage(result.message)
    if (result.ok) {
      setAccount(null)
      setInvitationUrl('')
    }
    setBusy(false)
  }

  return (
    <section className="account-section" aria-labelledby="account-heading">
      <div className="section-heading">
        <div><p className="eyebrow">Identity</p><h2 id="account-heading">Your account</h2></div>
      </div>
      {message && <p className="account-message" role="status">{message}</p>}

      {verificationPending && (
        <div className="account-card">
          <h3>Verify your email</h3>
          <p>Complete this step before signing in.</p>
          <button type="button" disabled={busy} onClick={() => void handleVerify()}>Verify email</button>
        </div>
      )}

      {account ? (
        <div className="account-card">
          <h3>Signed in as {account.userName}</h3>
          <p>{account.email}</p>
          <p>Access: {account.products.length ? account.products.join(', ') : 'No products yet'}</p>
          <button type="button" disabled={busy} onClick={() => void handleLogout()}>Sign out</button>
          {account.isSharedAdministrator && (
            <div className="admin-actions">
              <h3>Invite someone to Janus campaigns</h3>
              <p>The link works for multiple people for 24 hours. Each person must verify their own email.</p>
              <button type="button" disabled={busy} onClick={() => void handleInvite()}>Create invitation</button>
              {invitationUrl && <p><a href={invitationUrl}>{invitationUrl}</a></p>}
            </div>
          )}
        </div>
      ) : (
        <div className="account-grid">
          <form className="account-card" onSubmit={(event) => void handleLogin(event)}>
            <h3>Sign in</h3>
            <label>Username or email<input name="identifier" autoComplete="username" required /></label>
            <label>Password<input name="password" type="password" autoComplete="current-password" required /></label>
            <label className="check-label"><input name="rememberMe" type="checkbox" /> Remember me</label>
            <button type="submit" disabled={busy}>Sign in</button>
          </form>
          {invitation && !registrationComplete && (
            <form className="account-card" onSubmit={(event) => void handleRegister(event)}>
              <h3>Create an account</h3>
              <p>This invitation grants access to Janus campaigns after email verification.</p>
              <label>Username<input name="userName" autoComplete="username" required /></label>
              <label>Email<input name="email" type="email" autoComplete="email" required /></label>
              <label>Password<input name="password" type="password" autoComplete="new-password" minLength={15} required /></label>
              <p>Use at least 15 characters. Spaces and passphrases are welcome.</p>
              <button type="submit" disabled={busy}>Create account</button>
            </form>
          )}
        </div>
      )}

      <div className="account-card inbox-card">
        <div className="section-heading"><h3>Local test inbox</h3><button type="button" onClick={() => void refresh()}>Refresh</button></div>
        <p>Verification emails appear here during local development.</p>
        {inbox.length === 0 ? <p>No messages yet.</p> : (
          <ul>{inbox.map((mail) => (
            <li key={mail.actionUrl}>
              <strong>{mail.subject}</strong> for {mail.recipient} · {new Date(mail.createdAtUtc).toLocaleString()}
              <br /><a href={mail.actionUrl}>Open verification link</a>
            </li>
          ))}</ul>
        )}
      </div>
    </section>
  )
}

export default AccountPortal
