import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { chromium } from 'playwright-core'

const identifier = process.env.JANUS_TEST_IDENTIFIER
const password = process.env.JANUS_TEST_PASSWORD
const portal = process.env.JANUS_TEST_PORTAL ?? 'http://localhost:5186/portal.html'
const campaigns = process.env.JANUS_TEST_CAMPAIGNS ?? 'http://localhost:5199/'
if (!identifier || !password) {
  throw new Error('Set JANUS_TEST_IDENTIFIER and JANUS_TEST_PASSWORD for a disposable, verified campaign account.')
}

async function runCase(rememberMe) {
  const profile = await mkdtemp(join(tmpdir(), 'janus-browser-session-'))
  const absolute = resolve(profile)
  if (dirname(absolute) !== resolve(tmpdir()) || !basename(absolute).startsWith('janus-browser-session-')) {
    throw new Error('Refusing to use an unexpected browser profile path.')
  }
  let browser
  const launch = () => chromium.launchPersistentContext(profile, {
    channel: process.env.JANUS_TEST_BROWSER_CHANNEL ?? 'chrome',
    headless: true,
  })

  try {
    browser = await launch()
    let page = browser.pages()[0] ?? await browser.newPage()
    await page.goto(portal)
    await page.getByLabel('Username or email').fill(identifier)
    await page.getByLabel('Password', { exact: true }).fill(password)
    if (rememberMe) await page.getByLabel('Remember me').check()
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    await page.getByRole('heading', { name: `Signed in as ${identifier}` }).waitFor()

    const identityCookie = (await browser.cookies()).find(cookie => cookie.name === '.AspNetCore.Identity.Application')
    assert.ok(identityCookie, 'Identity cookie missing after login')
    if (rememberMe) {
      assert.ok(identityCookie.expires > Date.now() / 1000 + 29 * 24 * 60 * 60,
        'Remember me did not create a persistent cookie')
    } else {
      assert.equal(identityCookie.expires, -1, 'Ordinary login created a persistent cookie')
    }

    await page.goto(campaigns)
    await page.getByRole('heading', { name: `Signed in as ${identifier}` }).waitFor()
    await browser.close()
    browser = undefined

    browser = await launch()
    page = browser.pages()[0] ?? await browser.newPage()
    await page.goto(portal)
    if (rememberMe) {
      await page.getByRole('heading', { name: `Signed in as ${identifier}` }).waitFor()
    } else {
      await page.getByRole('heading', { name: 'Sign in', exact: true }).waitFor()
    }
    await page.goto(campaigns)
    await page.getByRole('heading', {
      name: rememberMe ? `Signed in as ${identifier}` : 'Sign in to Janus campaigns',
    }).waitFor()
    console.log(`${rememberMe ? 'Remembered' : 'Ordinary'} login browser-reopen check passed.`)
  } finally {
    if (browser) await browser.close()
    await rm(absolute, { recursive: true, force: true })
  }
}

await runCase(false)
await runCase(true)
