import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'

const identifier = process.env.JANUS_TEST_IDENTIFIER
const password = process.env.JANUS_TEST_PASSWORD
const campaignName = process.env.JANUS_TEST_CAMPAIGN
const encounterName = process.env.JANUS_TEST_ENCOUNTER
const pcName = process.env.JANUS_TEST_PC
const expectedPhase = process.env.JANUS_TEST_PHASE ?? 'Finished'
const portal = process.env.JANUS_TEST_PORTAL ?? 'http://localhost:5186/portal.html'
const campaigns = process.env.JANUS_TEST_CAMPAIGNS ?? 'http://localhost:5199/'
if (!identifier || !password || !campaignName || !encounterName || !pcName) {
  throw new Error('Set JANUS_TEST_IDENTIFIER, JANUS_TEST_PASSWORD, JANUS_TEST_CAMPAIGN, JANUS_TEST_ENCOUNTER, and JANUS_TEST_PC.')
}

const browser = await chromium.launch({
  channel: process.env.JANUS_TEST_BROWSER_CHANNEL ?? 'chrome',
  headless: true,
})
try {
  const page = await browser.newPage()
  await page.goto(portal)
  await page.getByLabel('Username or email').fill(identifier)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await page.getByRole('heading', { name: `Signed in as ${identifier}` }).waitFor()

  await page.goto(campaigns)
  await page.locator('.campaign-list button').filter({ hasText: campaignName }).click()
  await page.locator('.encounter-list button').filter({ hasText: encounterName }).click()
  await page.locator('.encounter-detail').getByText(`Phase: ${expectedPhase}.`, { exact: false }).waitFor()
  await page.locator('.encounter-detail').getByText('Round 2.', { exact: false }).waitFor()
  const pc = page.locator('.encounter-participants > li').filter({ hasText: pcName })
  await pc.locator('.unconscious-label').waitFor()
  assert.equal(await page.locator('.encounter-participants > li').count(), 3)
  if (expectedPhase === 'Fight') {
    await pc.locator('.active-label').waitFor()
    await pc.getByText('Turns completed: 1', { exact: false }).waitFor()
    assert.equal(await page.locator('.encounter-detail').getByRole('button', { name: 'Next' }).count(), 1)
  } else {
    assert.equal(await page.locator('.encounter-detail').getByRole('button', { name: 'Next' }).count(), 0)
  }
  console.log(`${expectedPhase} encounter survived host restart with round, participants, and HP status.`)
} finally {
  await browser.close()
}
