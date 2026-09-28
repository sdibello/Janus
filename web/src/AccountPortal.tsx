import { useCallback, useEffect, useLayoutEffect, useState, type FormEvent } from 'react'
import useSessionActivity from './useSessionActivity'
import { identityApi, identityOrigin } from './runtime'

type Account = {
  id: string
  userName: string
  email: string
  products: string[]
  administeredProducts: string[]
  isSharedAdministrator: boolean
}

type Product = { id: string; name: string }
type AccessRequest = {
  id: string
  productId: string
  status: string
  createdAtUtc: string
  resolvedAtUtc: string | null
}
type ManagedRequest = AccessRequest & { userId: string; userName: string; email: string }
type ProductGrant = { id: string; userName: string; email: string; productId: string; grantedAtUtc: string }

type MailMessage = {
  recipient: string
  subject: string
  actionUrl: string
  createdAtUtc: string
}

const api = identityApi

function readLink() {
  const query = new URLSearchParams(window.location.search)
  return {
    invitation: query.get('invite') ?? '',
    verifyUser: query.get('verifyUser') ?? '',
    verifyToken: query.get('verifyToken') ?? '',
    resetUser: query.get('resetUser') ?? '',
    resetToken: query.get('resetToken') ?? '',
    returnTo: query.get('returnTo') ?? '',
  }
}

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
      message: data.message ?? (response.ok ? 'Done.' : response.status === 401 ? 'Sign-in failed. Check your credentials and email verification.' : response.status === 403 ? 'You do not have permission for this action.' : 'The request could not be completed.'),
      data,
    }
  } catch {
    return { ok: false, message: 'The identity service is unavailable.' }
  }
}

function AccountPortal() {
  const [link] = useState(readLink)
  const { invitation, verifyUser, verifyToken, resetUser, resetToken, returnTo } = link
  const [account, setAccount] = useState<Account | null>(null)
  useSessionActivity(account !== null)
  const [inbox, setInbox] = useState<MailMessage[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [ownRequests, setOwnRequests] = useState<AccessRequest[]>([])
  const [managedRequests, setManagedRequests] = useState<ManagedRequest[]>([])
  const [grants, setGrants] = useState<Record<string, ProductGrant[]>>({})
  const [inviteProduct, setInviteProduct] = useState('')
  const [grantProduct, setGrantProduct] = useState('')
  const [message, setMessage] = useState('')
  const [invitationUrl, setInvitationUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [verificationPending, setVerificationPending] = useState(Boolean(verifyUser && verifyToken))
  const [registrationComplete, setRegistrationComplete] = useState(false)
  const [resetPending, setResetPending] = useState(Boolean(resetUser && resetToken))
  const [requestingReset, setRequestingReset] = useState(false)
  const [resetRequested, setResetRequested] = useState(false)

  useLayoutEffect(() => {
    const url = new URL(window.location.href)
    for (const name of ['invite', 'verifyUser', 'verifyToken', 'resetUser', 'resetToken']) {
      url.searchParams.delete(name)
    }
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
  }, [])

  const refresh = useCallback(async () => {
    try {
      const [meResponse, inboxResponse, productsResponse] = await Promise.all([
        fetch(`${api}/account/me`, { cache: 'no-store' }),
        fetch(`${api}/dev/inbox`, { cache: 'no-store' }),
        fetch(`${api}/products`, { cache: 'no-store' }),
      ])
      const currentAccount = meResponse.ok ? await meResponse.json() as Account : null
      const listedProducts = productsResponse.ok ? await productsResponse.json() as Product[] : []
      setAccount(currentAccount)
      setProducts(listedProducts)
      if (inboxResponse.ok) setInbox(await inboxResponse.json() as MailMessage[])
      if (!currentAccount) {
        setOwnRequests([])
        setManagedRequests([])
        setGrants({})
        return
      }

      const managedProductIds = currentAccount.isSharedAdministrator
        ? listedProducts.map((product) => product.id)
        : currentAccount.administeredProducts
      const [ownResponse, managedResponse, ...grantResponses] = await Promise.all([
        fetch(`${api}/account/access-requests`, { cache: 'no-store' }),
        managedProductIds.length
          ? fetch(`${api}/admin/access-requests`, { cache: 'no-store' })
          : Promise.resolve(null),
        ...managedProductIds.map((id) => fetch(`${api}/admin/products/${encodeURIComponent(id)}/grants`, { cache: 'no-store' })),
      ])
      setOwnRequests(ownResponse.ok ? await ownResponse.json() as AccessRequest[] : [])
      setManagedRequests(managedResponse?.ok ? await managedResponse.json() as ManagedRequest[] : [])
      const loadedGrants: Record<string, ProductGrant[]> = {}
      for (let index = 0; index < managedProductIds.length; index += 1) {
        loadedGrants[managedProductIds[index]] = grantResponses[index].ok
          ? await grantResponses[index].json() as ProductGrant[]
          : []
      }
      setGrants(loadedGrants)
    } catch {
      setMessage('The identity service is unavailable.')
    }
  }, [])

  useEffect(() => {
    let active = true
    void Promise.resolve().then(() => { if (active) return refresh() })
    return () => { active = false }
  }, [refresh])

  async function handleVerify() {
    setBusy(true)
    const result = await post('/account/verify-email', { userId: verifyUser, token: verifyToken })
    setMessage(result.message)
    if (result.ok) {
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
    if (result.ok) {
      if (returnTo) {
        try {
          const origin = new URL(identityOrigin).origin
          const target = new URL(returnTo, origin)
          if (target.origin === origin && target.pathname === '/connect/authorize') {
            window.location.assign(target.href)
            return
          }
        } catch { /* Ignore malformed return URLs after a successful sign-in. */ }
      }
      await refresh()
    }
    setBusy(false)
  }

  async function handleRequestReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    const values = new FormData(event.currentTarget)
    const result = await post('/account/request-password-reset', { email: values.get('email') })
    setMessage(result.message)
    if (result.ok) {
      setResetRequested(true)
      await refresh()
    }
    setBusy(false)
  }

  async function handleResetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    const result = await post('/account/reset-password', {
      userId: resetUser,
      token: resetToken,
      newPassword: new FormData(event.currentTarget).get('newPassword'),
    })
    setMessage(result.message)
    if (result.ok) {
      setResetPending(false)
      await refresh()
    }
    setBusy(false)
  }

  async function handleChangePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    const form = event.currentTarget
    const values = new FormData(form)
    const result = await post('/account/change-password', {
      currentPassword: values.get('currentPassword'),
      newPassword: values.get('newPassword'),
    })
    setMessage(result.message)
    if (result.ok) {
      form.reset()
      await refresh()
    }
    setBusy(false)
  }

  async function handleInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const manageable = account?.isSharedAdministrator
      ? products : products.filter((product) => account?.administeredProducts.includes(product.id))
    const productId = inviteProduct || manageable[0]?.id
    if (!productId) return
    setBusy(true)
    const result = await post('/admin/invitations', { productId })
    setMessage(result.ok ? 'Invitation created. Share this link with the person you want to invite.' : result.message)
    setInvitationUrl(result.data?.url ?? '')
    setBusy(false)
  }

  async function handleRequestAccess(productId: string) {
    setBusy(true)
    const result = await post(`/products/${encodeURIComponent(productId)}/access-requests`, {})
    setMessage(result.ok ? 'Access request sent.' : result.message)
    if (result.ok) await refresh()
    setBusy(false)
  }

  async function handleResolveRequest(id: string, decision: 'approve' | 'reject') {
    setBusy(true)
    const result = await post(`/admin/access-requests/${encodeURIComponent(id)}/${decision}`, {})
    setMessage(result.ok ? `Access request ${decision === 'approve' ? 'approved' : 'rejected'}.` : result.message)
    if (result.ok) await refresh()
    setBusy(false)
  }

  async function handleCreateProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const values = new FormData(form)
    setBusy(true)
    const result = await post('/admin/products', { id: values.get('id'), name: values.get('name') })
    setMessage(result.ok ? 'Product created.' : result.message)
    if (result.ok) {
      form.reset()
      await refresh()
    }
    setBusy(false)
  }

  async function handleAppointAdministrator(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const values = new FormData(form)
    setBusy(true)
    const productId = values.get('productId')
    const result = await post('/admin/administrators', {
      identifier: values.get('identifier'),
      productId: productId ? String(productId) : null,
    })
    setMessage(result.ok ? 'Administrator appointed.' : result.message)
    if (result.ok) {
      form.reset()
      await refresh()
    }
    setBusy(false)
  }

  async function handleRevokeGrant(grant: ProductGrant) {
    if (!window.confirm(`Revoke ${grant.userName}'s access to ${grant.productId}?`)) return
    setBusy(true)
    const result = await post(`/admin/products/${encodeURIComponent(grant.productId)}/grants/${encodeURIComponent(grant.id)}/revoke`, {})
    setMessage(result.ok ? 'Product access revoked.' : result.message)
    if (result.ok) await refresh()
    setBusy(false)
  }

  async function handleLogout() {
    setBusy(true)
    const result = await post('/account/logout', {})
    setMessage(result.message)
    if (result.ok) {
      setAccount(null)
      setInvitationUrl('')
      setOwnRequests([])
      setManagedRequests([])
      setGrants({})
    }
    setBusy(false)
  }

  const manageableProducts = account?.isSharedAdministrator
    ? products : products.filter((product) => account?.administeredProducts.includes(product.id))
  const selectedInviteProduct = manageableProducts.some((product) => product.id === inviteProduct)
    ? inviteProduct : manageableProducts[0]?.id ?? ''
  const selectedGrantProduct = manageableProducts.some((product) => product.id === grantProduct)
    ? grantProduct : manageableProducts[0]?.id ?? ''
  const pendingRequests = managedRequests.filter((request) => request.status === 'Pending')

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

      {resetPending && (
        <form className="account-card account-narrow" onSubmit={(event) => void handleResetPassword(event)}>
          <h3>Reset your password</h3>
          <p>Choose a new password for your account.</p>
          <label>New password<input name="newPassword" type="password" autoComplete="new-password" minLength={15} required /></label>
          <p>Use at least 15 characters. Spaces and passphrases are welcome.</p>
          <button type="submit" disabled={busy}>Reset password</button>
        </form>
      )}

      {account ? (
        <div className="account-grid">
          <div className="account-card">
            <h3>Signed in as {account.userName}</h3>
            <p>{account.email}</p>
            <p>Access: {account.products.length ? account.products.join(', ') : 'No products yet'}</p>
            <button type="button" disabled={busy} onClick={() => void handleLogout()}>Sign out</button>
          </div>
          <form className="account-card" onSubmit={(event) => void handleChangePassword(event)}>
            <h3>Change password</h3>
            <label>Current password<input name="currentPassword" type="password" autoComplete="current-password" required /></label>
            <label>New password<input name="newPassword" type="password" autoComplete="new-password" minLength={15} required /></label>
            <p>Use at least 15 characters. Spaces and passphrases are welcome.</p>
            <button type="submit" disabled={busy}>Change password</button>
          </form>
        </div>
      ) : (
        <div className="account-grid">
          {requestingReset ? (
            <div className="account-card">
              <h3>Forgot your password?</h3>
              {resetRequested ? (
                <p>If that email belongs to an account, a password reset link is on its way. Check the local test inbox below.</p>
              ) : (
                <form onSubmit={(event) => void handleRequestReset(event)}>
                  <p>Enter your account email to request a reset link.</p>
                  <label>Email<input name="email" type="email" autoComplete="email" required /></label>
                  <button type="submit" disabled={busy}>Send reset link</button>
                </form>
              )}
              <button className="account-text-button" type="button" onClick={() => { setRequestingReset(false); setResetRequested(false); setMessage('') }}>Back to sign in</button>
            </div>
          ) : (
            <form className="account-card" onSubmit={(event) => void handleLogin(event)}>
              <h3>Sign in</h3>
              <label>Username or email<input name="identifier" autoComplete="username" required /></label>
              <label>Password<input name="password" type="password" autoComplete="current-password" required /></label>
              <label className="check-label"><input name="rememberMe" type="checkbox" /> Remember me</label>
              <button type="submit" disabled={busy}>Sign in</button>
              <button className="account-text-button" type="button" onClick={() => { setRequestingReset(true); setMessage('') }}>Forgot password?</button>
            </form>
          )}
          {invitation && !registrationComplete && (
            <form className="account-card" onSubmit={(event) => void handleRegister(event)}>
              <h3>Create an account</h3>
              <p>This invitation grants access to its product after email verification.</p>
              <label>Username<input name="userName" autoComplete="username" required /></label>
              <label>Email<input name="email" type="email" autoComplete="email" required /></label>
              <label>Password<input name="password" type="password" autoComplete="new-password" minLength={15} required /></label>
              <p>Use at least 15 characters. Spaces and passphrases are welcome.</p>
              <button type="submit" disabled={busy}>Create account</button>
            </form>
          )}
        </div>
      )}

      {account && (
        <section className="account-subsection" aria-labelledby="products-heading">
          <div className="section-heading"><h3 id="products-heading">Products</h3></div>
          {products.length === 0 ? <p>No products are registered yet.</p> : (
            <div className="account-product-grid">
              {products.map((product) => {
                const granted = account.products.includes(product.id)
                const latestRequest = ownRequests.find((request) => request.productId === product.id)
                const pending = !granted && latestRequest?.status === 'Pending'
                return (
                  <article className="account-card account-product" key={product.id}>
                    <h4>{product.name}</h4>
                    <p className="account-product-id">{product.id}</p>
                    <p className={`account-access-state ${granted ? 'granted' : pending ? 'pending' : ''}`}>
                      {granted ? 'Access granted' : pending ? 'Request pending' : latestRequest?.status === 'Rejected' ? 'Last request rejected' : 'No access'}
                    </p>
                    {!granted && !pending && (
                      <button type="button" disabled={busy} onClick={() => void handleRequestAccess(product.id)}>Request access</button>
                    )}
                  </article>
                )
              })}
            </div>
          )}
        </section>
      )}

      {account && manageableProducts.length > 0 && (
        <section className="account-subsection" aria-labelledby="manage-heading">
          <div className="section-heading"><h3 id="manage-heading">Manage access</h3></div>
          <div className="account-grid">
            <form className="account-card" onSubmit={(event) => void handleInvite(event)}>
              <h4>Invite someone</h4>
              <p>The link works for multiple people for 24 hours. Each person must verify their email.</p>
              <label>Product
                <select value={selectedInviteProduct} onChange={(event) => setInviteProduct(event.target.value)}>
                  {manageableProducts.map((product) => <option value={product.id} key={product.id}>{product.name}</option>)}
                </select>
              </label>
              <button type="submit" disabled={busy}>Create invitation</button>
              {invitationUrl && <p className="invitation-link"><a href={invitationUrl}>{invitationUrl}</a></p>}
            </form>
            <div className="account-card">
              <h4>Pending access requests</h4>
              {pendingRequests.length === 0 ? <p>No requests to review.</p> : (
                <ul className="account-list">
                  {pendingRequests.map((request) => (
                    <li key={request.id}>
                      <div><strong>{request.userName}</strong> · {request.email}<br /><small>{products.find((product) => product.id === request.productId)?.name ?? request.productId}</small></div>
                      <div className="account-actions">
                        <button type="button" disabled={busy} onClick={() => void handleResolveRequest(request.id, 'approve')}>Approve</button>
                        <button type="button" disabled={busy} onClick={() => void handleResolveRequest(request.id, 'reject')}>Reject</button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <div className="account-card">
            <h4>Current grants</h4>
            <label>Product
              <select value={selectedGrantProduct} onChange={(event) => setGrantProduct(event.target.value)}>
                {manageableProducts.map((product) => <option value={product.id} key={product.id}>{product.name}</option>)}
              </select>
            </label>
            {(grants[selectedGrantProduct] ?? []).length === 0 ? <p>No users currently have access to this product.</p> : (
              <ul className="account-list">
                {(grants[selectedGrantProduct] ?? []).map((grant) => (
                  <li key={grant.id}>
                    <div><strong>{grant.userName}</strong> · {grant.email}</div>
                    <button type="button" disabled={busy} onClick={() => void handleRevokeGrant(grant)}>Revoke access</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      {account?.isSharedAdministrator && (
        <section className="account-subsection" aria-labelledby="setup-heading">
          <div className="section-heading"><h3 id="setup-heading">Shared administration</h3></div>
          <div className="account-grid">
            <form className="account-card" onSubmit={(event) => void handleCreateProduct(event)}>
              <h4>Register a product</h4>
              <label>Product ID<input name="id" pattern="[a-z0-9][a-z0-9-]{0,63}" maxLength={64} placeholder="my-product" required /></label>
              <label>Display name<input name="name" maxLength={100} required /></label>
              <button type="submit" disabled={busy}>Register product</button>
            </form>
            <form className="account-card" onSubmit={(event) => void handleAppointAdministrator(event)}>
              <h4>Appoint an administrator</h4>
              <p>The person must already have a verified account.</p>
              <label>Username or email<input name="identifier" autoComplete="off" required /></label>
              <label>Scope
                <select name="productId" defaultValue="">
                  <option value="">Shared administrator · all products</option>
                  {products.map((product) => <option value={product.id} key={product.id}>{product.name}</option>)}
                </select>
              </label>
              <button type="submit" disabled={busy}>Appoint administrator</button>
            </form>
          </div>
        </section>
      )}

      <div className="account-card inbox-card">
        <div className="section-heading"><h3>Local test inbox</h3><button type="button" onClick={() => void refresh()}>Refresh</button></div>
        <p>Verification and password reset emails appear here during local development.</p>
        {inbox.length === 0 ? <p>No messages yet.</p> : (
          <ul>{inbox.map((mail) => (
            <li key={mail.actionUrl}>
              <strong>{mail.subject}</strong> for {mail.recipient} · {new Date(mail.createdAtUtc).toLocaleString()}
              <br /><a href={mail.actionUrl}>{mail.subject.toLowerCase().includes('password') || mail.actionUrl.includes('resetUser=') ? 'Open password reset link' : 'Open verification link'}</a>
            </li>
          ))}</ul>
        )}
      </div>
    </section>
  )
}

export default AccountPortal
