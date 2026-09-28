export const identityOrigin = import.meta.env.VITE_IDENTITY_ORIGIN ?? 'http://localhost:5186'
export const campaignOrigin = import.meta.env.VITE_CAMPAIGN_ORIGIN ?? 'http://localhost:5199'

export const identityApi = import.meta.env.DEV ? '/api/identity' : identityOrigin
export const campaignApi = import.meta.env.DEV ? '/api/campaigns' : campaignOrigin
export const portalPage = import.meta.env.DEV ? '/portal.html' : `${identityOrigin}/portal.html`
export const campaignPage = import.meta.env.DEV ? '/' : `${campaignOrigin}/`
