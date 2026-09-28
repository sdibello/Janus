import { useCallback, useEffect, useState } from 'react'
import './App.css'
import AccountPortal from './AccountPortal'
import CampaignWorkspace from './CampaignWorkspace'
import useSessionActivity from './useSessionActivity'
import { campaignApi, campaignOrigin, campaignPage, identityApi, portalPage } from './runtime'

type ServiceName = 'identity' | 'campaigns'
type ServiceState = 'checking' | 'ready' | 'unavailable'
type CampaignProfile = { userId: string; userName: string; email: string; productId: string }
type CampaignSession = { state: 'checking' | 'signed-out' | 'ready' | 'denied' | 'unavailable'; profile?: CampaignProfile }
const services: { name: ServiceName; label: string; path: string }[] = [
  { name: 'identity', label: 'Accounts', path: `${identityApi}/health` },
  { name: 'campaigns', label: 'Campaign data', path: `${campaignApi}/health` },
]

function App({ page }: { page: 'campaigns' | 'portal' }) {
  const [status, setStatus] = useState<Record<ServiceName, ServiceState>>({
    identity: 'checking',
    campaigns: 'checking',
  })
  const [campaignSession, setCampaignSession] = useState<CampaignSession>({ state: 'checking' })
  const [encounterOpen, setEncounterOpen] = useState(false)
  const [signInFailed] = useState(() => new URLSearchParams(window.location.search).has('signInError'))
  const [silentSignInTried] = useState(() => new URLSearchParams(window.location.search).has('silent'))
  useSessionActivity(page === 'campaigns' && campaignSession.state === 'ready')

  const checkCampaignSession = useCallback(async (trySilentSignIn = false) => {
    try {
      const response = await fetch(`${campaignApi}/auth/me`, { cache: 'no-store' })
      if (response.ok) {
        setCampaignSession({ state: 'ready', profile: await response.json() as CampaignProfile })
      } else if ((response.status === 401 || response.status === 403)
        && trySilentSignIn && !signInFailed && !silentSignInTried) {
        window.location.assign(`${campaignOrigin}/auth/try-sign-in`)
      } else {
        setCampaignSession({ state: response.status === 401 ? 'signed-out' : response.status === 403 ? 'denied' : 'unavailable' })
      }
    } catch {
      setCampaignSession({ state: 'unavailable' })
    }
  }, [signInFailed, silentSignInTried])

  const checkServices = useCallback(async () => {
    await Promise.all(
      services.map(async (service) => {
        try {
          const response = await fetch(service.path, { cache: 'no-store' })
          setStatus((current) => ({
            ...current,
            [service.name]: response.ok ? 'ready' : 'unavailable',
          }))
        } catch {
          setStatus((current) => ({ ...current, [service.name]: 'unavailable' }))
        }
      }),
    )
  }, [])

  useEffect(() => {
    void checkServices()
  }, [checkServices])

  useEffect(() => {
    let active = true
    void Promise.resolve().then(() => { if (active && page === 'campaigns') return checkCampaignSession(true) })
    return () => { active = false }
  }, [page, checkCampaignSession])

  async function signOutCampaign() {
    try {
      const response = await fetch(`${campaignApi}/auth/logout`, { method: 'POST' })
      if (response.ok) {
        setCampaignSession({ state: 'signed-out' })
        setEncounterOpen(false)
      }
      else setCampaignSession({ state: 'unavailable' })
    } catch {
      setCampaignSession({ state: 'unavailable' })
    }
  }

  const isPortal = page === 'portal'

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href={campaignPage} aria-label="Janus home">
          <span className="brand-mark" aria-hidden="true">J</span>
          <span>JANUS</span>
        </a>
        <nav aria-label="Primary navigation">
          <a className={!isPortal ? 'active' : ''} href={campaignPage} aria-current={!isPortal ? 'page' : undefined}>
            Campaigns
          </a>
          <a className={isPortal ? 'active' : ''} href={portalPage} aria-current={isPortal ? 'page' : undefined}>
            Access portal
          </a>
        </nav>
        {!isPortal && <div className="header-session" aria-label="Your session">
          {campaignSession.state === 'checking' && <span>Checking session…</span>}
          {campaignSession.state === 'ready' && <>
            <h3>Signed in as {campaignSession.profile?.userName}</h3>
            <button type="button" onClick={() => void signOutCampaign()}>Sign out</button>
          </>}
          {campaignSession.state === 'signed-out' && <>
            <h3>Sign in to Janus campaigns</h3>
            {signInFailed && <span>Sign-in failed. Check access in the portal.</span>}
            <a href={`${campaignOrigin}/auth/login`}>Sign in</a>
          </>}
          {campaignSession.state === 'denied' && <>
            <span>Campaign access required</span><a href={portalPage}>Request access</a>
          </>}
          {campaignSession.state === 'unavailable' && <>
            <span>Session unavailable</span>
            <button type="button" onClick={() => void checkCampaignSession()}>Try again</button>
          </>}
        </div>}
      </header>

      <main>
        {(!encounterOpen || isPortal) && <section className="hero-panel">
          <p className="eyebrow">Local development</p>
          <h1>{isPortal ? 'One account for every adventure.' : 'Keep the story moving.'}</h1>
          <p className="hero-copy">
            {isPortal
              ? 'Create an invited account, verify your email, and sign in to the shared access portal.'
              : 'Sign in with your Janus account to begin managing campaigns and encounters.'}
          </p>
          <div className="hero-rule" aria-hidden="true" />
          <p className="hero-note">
            {isPortal ? 'Identity service' : 'Campaign service'} · React / ASP.NET Core / SQLite
          </p>
        </section>}

        {!isPortal && campaignSession.state === 'ready' &&
          <CampaignWorkspace onEncounterOpenChange={setEncounterOpen} />}

        {isPortal && <section className="status-section" aria-labelledby="status-heading">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Environment</p>
              <h2 id="status-heading">Local services</h2>
            </div>
            <button type="button" onClick={() => {
              setStatus({ identity: 'checking', campaigns: 'checking' })
              void checkServices()
            }}>Check again</button>
          </div>
          <div className="service-grid">
            {services.map((service) => (
              <article className="service-card" key={service.name}>
                <div className="service-topline">
                  <span className="service-label">{service.label}</span>
                  <span className={`status-badge ${status[service.name]}`}>
                    {status[service.name] === 'checking' ? 'Checking' : status[service.name] === 'ready' ? 'Ready' : 'Unavailable'}
                  </span>
                </div>
                <p>{service.name === 'identity' ? 'Account and access data' : 'Campaign and encounter data'}</p>
              </article>
            ))}
          </div>
        </section>}

        {isPortal && <AccountPortal />}
      </main>

      <footer>Janus · Local build</footer>
    </div>
  )
}

export default App
