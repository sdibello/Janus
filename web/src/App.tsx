import { useCallback, useEffect, useState } from 'react'
import './App.css'

type ServiceName = 'identity' | 'campaigns'
type ServiceState = 'checking' | 'ready' | 'unavailable'

const services: { name: ServiceName; label: string; path: string }[] = [
  { name: 'identity', label: 'Accounts', path: '/api/identity/health' },
  { name: 'campaigns', label: 'Campaign data', path: '/api/campaigns/health' },
]

function App({ page }: { page: 'campaigns' | 'portal' }) {
  const [status, setStatus] = useState<Record<ServiceName, ServiceState>>({
    identity: 'checking',
    campaigns: 'checking',
  })

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

  const isPortal = page === 'portal'

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="/" aria-label="Janus home">
          <span className="brand-mark" aria-hidden="true">J</span>
          <span>JANUS</span>
        </a>
        <nav aria-label="Primary navigation">
          <a className={!isPortal ? 'active' : ''} href="/" aria-current={!isPortal ? 'page' : undefined}>
            Campaigns
          </a>
          <a className={isPortal ? 'active' : ''} href="/portal.html" aria-current={isPortal ? 'page' : undefined}>
            Access portal
          </a>
        </nav>
      </header>

      <main>
        <section className="hero-panel">
          <p className="eyebrow">Local development</p>
          <h1>{isPortal ? 'One account for every adventure.' : 'Keep the story moving.'}</h1>
          <p className="hero-copy">
            {isPortal
              ? 'The shared account and application access portal will live here. Its database and service are taking shape.'
              : 'Campaigns, characters, and encounters will live here. The local foundation is running while the first workflows are built.'}
          </p>
          <div className="hero-rule" aria-hidden="true" />
          <p className="hero-note">
            {isPortal ? 'Identity service' : 'Campaign service'} · React / ASP.NET Core / SQLite
          </p>
        </section>

        <section className="status-section" aria-labelledby="status-heading">
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
        </section>
      </main>

      <footer>Janus · Local build</footer>
    </div>
  )
}

export default App
