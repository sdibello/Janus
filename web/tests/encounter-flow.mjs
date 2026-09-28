import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'

const identifier = process.env.JANUS_TEST_IDENTIFIER
const password = process.env.JANUS_TEST_PASSWORD
const portal = process.env.JANUS_TEST_PORTAL ?? 'http://localhost:5186/portal.html'
const campaigns = process.env.JANUS_TEST_CAMPAIGNS ?? 'http://localhost:5199/'
if (!identifier || !password) {
  throw new Error('Set JANUS_TEST_IDENTIFIER and JANUS_TEST_PASSWORD for a disposable, verified campaign account.')
}

const suffix = process.env.JANUS_TEST_SUFFIX ?? Date.now().toString(36)
const campaignName = `Browser campaign ${suffix}`
const pcName = `Browser PC ${suffix}`
const mobName = `Browser mob ${suffix}`
const secondMobName = `Late mob ${suffix}`
const encounterName = `Browser encounter ${suffix}`
const browser = await chromium.launch({
  channel: process.env.JANUS_TEST_BROWSER_CHANNEL ?? 'chrome',
  headless: true,
})

try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 3200 } })
  const page = await context.newPage()
  await page.goto(portal)
  await page.getByLabel('Username or email').fill(identifier)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await page.getByRole('heading', { name: `Signed in as ${identifier}` }).waitFor()

  await page.goto(campaigns)
  await page.getByRole('heading', { name: `Signed in as ${identifier}` }).waitFor()
  await page.getByLabel('Campaign name').fill(campaignName)
  await page.getByRole('button', { name: 'Create campaign' }).click()
  await page.getByRole('heading', { name: campaignName, exact: true }).waitFor()

  await page.getByLabel('Character name').fill(pcName)
  await page.getByRole('button', { name: 'Add character' }).first().click()
  await page.locator('.character-list').getByText(pcName, { exact: true }).waitFor()

  await page.getByLabel('Encounter name').fill(encounterName)
  await page.getByRole('button', { name: 'Create encounter' }).click()
  await page.locator('.encounter-detail').getByRole('heading', { name: encounterName }).waitFor()

  const characterForm = page.locator('.encounter-detail form').filter({ has: page.locator('[name="characterId"]') })
  await characterForm.getByLabel('Initiative (can be entered later)').fill('18')
  await characterForm.getByLabel('Starting HP (optional)').fill('10.5')
  await characterForm.getByRole('button', { name: 'Add character' }).click()
  const pc = page.locator('.encounter-participants > li').filter({ hasText: pcName })
  await pc.waitFor()

  const mobForm = page.locator('.encounter-detail form').filter({ has: page.locator('[name="mobName"]') })
  await mobForm.getByLabel('Mob name').fill(mobName)
  await mobForm.getByLabel('Initiative (can be entered later)').fill('12')
  await mobForm.getByLabel('Starting HP (optional)').fill('1.5')
  await mobForm.getByRole('button', { name: 'Add mob' }).click()
  const mob = page.locator('.encounter-participants > li').filter({ hasText: mobName })
  await mob.waitFor()
  assert.equal(await page.locator('.encounter-participants > li').count(), 2)

  await page.getByRole('button', { name: 'Begin Fight' }).click()
  await pc.locator('.active-label').waitFor()
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await mob.locator('.active-label').waitFor()
  await pc.getByText('Turns completed: 1', { exact: false }).waitFor()
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await pc.locator('.active-label').waitFor()
  await page.locator('.encounter-detail').getByText('Round 2.', { exact: false }).waitFor()

  await pc.getByLabel('Damage amount').fill('20.5')
  await pc.getByRole('button', { name: 'Damage' }).click()
  await pc.locator('.alive-adjacent-label').waitFor()
  await pc.getByLabel('Heal amount').fill('0.5')
  await pc.getByRole('button', { name: 'Heal' }).click()
  await pc.locator('.unconscious-label').waitFor()

  await mob.getByRole('button', { name: 'Move up' }).click()
  await mob.locator('.active-label').waitFor()
  await pc.getByRole('button', { name: 'Set active' }).click()
  await pc.locator('.active-label').waitFor()
  await page.getByRole('button', { name: 'Skip' }).click()
  await mob.locator('.active-label').waitFor()
  await page.locator('.encounter-detail').getByText('Round 2.', { exact: false }).waitFor()

  await mobForm.getByLabel('Mob name').fill(secondMobName)
  await mobForm.getByLabel('Starting HP (optional)').fill('3')
  await mobForm.getByRole('button', { name: 'Add mob' }).click()
  await page.locator('.encounter-participants > li').first().locator('strong')
    .filter({ hasText: secondMobName }).waitFor()
  assert.equal(await page.locator('.encounter-participants > li').first().locator('strong').textContent(), secondMobName)
  await mob.locator('.active-label').waitFor()

  const lateMob = page.locator('.encounter-participants > li').filter({ hasText: secondMobName })
  const pcBounds = await pc.boundingBox()
  const lateBounds = await lateMob.boundingBox()
  assert.ok(pcBounds, 'PC must be visible for drag-and-drop')
  assert.ok(lateBounds, 'Late mob must be visible for drag-and-drop')
  const sourceHit = await page.evaluate(({ x, y }) =>
    document.elementFromPoint(x, y)?.closest('.encounter-participants > li')?.querySelector('strong')?.textContent,
  { x: lateBounds.x + 10, y: lateBounds.y + 10 })
  assert.equal(sourceHit, secondMobName, 'Drag source must be the late mob')
  await page.evaluate(() => {
    window.__janusDragEvents = []
    for (const type of ['dragstart', 'dragenter', 'dragover', 'drop', 'dragend']) {
      document.addEventListener(type, event => {
        const row = event.target instanceof Element ? event.target.closest('.encounter-participants > li') : null
        window.__janusDragEvents.push(`${type}:${row?.querySelector('strong')?.textContent ?? 'none'}`)
      }, true)
    }
  })
  const reordered = page.waitForResponse(response => response.url().endsWith('/reorder'), { timeout: 10000 })
    .catch(() => null)
  await lateMob.dragTo(pc, {
    sourcePosition: { x: 10, y: 10 },
    targetPosition: { x: 10, y: pcBounds.height - 5 },
  })
  const reorderResponse = await reordered
  if (!reorderResponse) {
    const events = await page.evaluate(() => window.__janusDragEvents)
    throw new Error(`Drag did not request reorder: ${events.join(', ')}`)
  }
  assert.equal(reorderResponse.status(), 200)
  await pc.locator('.active-label').waitFor()
  await page.locator('.encounter-participants > li').last().locator('strong')
    .filter({ hasText: secondMobName }).waitFor()
  assert.equal(await page.locator('.encounter-participants > li').last().locator('strong').textContent(), secondMobName)

  if (process.env.JANUS_TEST_STOP_AT_FIGHT === '1') {
    console.log(`Fight saved for restart check: ${campaignName} | ${encounterName} | ${pcName}`)
  } else {
    page.once('dialog', dialog => dialog.accept())
    await page.getByRole('button', { name: 'End encounter' }).click()
    await page.locator('.encounter-detail').getByText('Phase: Finished.', { exact: false }).waitFor()
    assert.equal(await page.locator('.encounter-detail').getByRole('button', { name: 'Save HP' }).count(), 0)

    await page.reload()
    await page.locator('.campaign-list button').filter({ hasText: campaignName }).click()
    await page.locator('.encounter-list button').filter({ hasText: encounterName }).click()
    await page.locator('.encounter-detail').getByText('Phase: Finished.', { exact: false }).waitFor()
    await page.locator('.encounter-participants > li').filter({ hasText: pcName })
      .locator('.unconscious-label').waitFor()
    assert.equal(await page.locator('.encounter-participants > li').count(), 3)
    console.log('Campaign, Fight, HP, drag-and-drop, Skip, insertion, and finished reload passed.')
  }
} finally {
  await browser.close()
}
