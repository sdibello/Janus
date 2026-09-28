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
const npcName = `Browser NPC ${suffix}`
const preparationName = `Initiative check ${suffix}`
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
  await page.getByLabel('Character name').fill(npcName)
  await page.getByLabel('Type').selectOption('Npc')
  await page.getByRole('button', { name: 'Add character' }).first().click()
  await page.locator('.character-list').getByText(npcName, { exact: true }).waitFor()

  await page.getByLabel('Encounter name').fill(preparationName)
  await page.getByRole('button', { name: 'Create encounter' }).click()
  await page.locator('.encounter-detail').getByRole('heading', { name: preparationName }).waitFor()
  await page.getByRole('button', { name: 'Add All' }).click()
  const preparedPc = page.locator('.encounter-participants > li').filter({ hasText: pcName })
  const preparedNpc = page.locator('.encounter-participants > li').filter({ hasText: npcName })
  await preparedNpc.waitFor()
  const prepareMobForm = page.locator('.encounter-detail form').filter({ has: page.locator('[name="mobName"]') })
  await prepareMobForm.getByLabel('Mob name').fill(mobName)
  await prepareMobForm.getByRole('button', { name: 'Add mob' }).click()
  await page.locator('.encounter-participants > li').filter({ hasText: mobName }).waitFor()
  assert.equal(await preparedPc.locator('.hp-input-line').count(), 0)
  await preparedPc.locator('.prepare-row-select').click()
  assert.equal(await preparedPc.locator('.hp-input-line > button').textContent(), 'Save')
  assert.equal(await preparedPc.locator('.hp-input-line > input').count(), 1)
  assert.equal(await page.getByRole('heading', { name: 'Local services' }).count(), 0)
  assert.equal(await page.getByLabel('Character name').count(), 0)
  await page.getByRole('button', { name: 'Begin Fight' }).click()
  const prompt = page.getByRole('dialog')
  await prompt.getByLabel(`Initiative for ${pcName}`).fill('8')
  await prompt.getByRole('button', { name: 'Save and continue' }).click()
  await prompt.getByLabel(`Initiative for ${npcName}`).waitFor()
  await prompt.getByRole('button', { name: 'Close and keep progress' }).click()

  await page.reload()
  await page.locator('.campaign-list button').filter({ hasText: campaignName }).click()
  await page.locator('.encounter-list button').filter({ hasText: preparationName }).click()
  await page.getByRole('button', { name: 'Begin Fight' }).click()
  assert.equal(await prompt.getByLabel(`Initiative for ${pcName}`).inputValue(), '8')
  await prompt.getByRole('button', { name: 'Save and continue' }).click()
  await prompt.getByLabel(`Initiative for ${npcName}`).fill('8')
  await prompt.getByRole('button', { name: 'Save and continue' }).click()
  await prompt.getByLabel(`Initiative for ${mobName}`).fill('8')
  await prompt.getByRole('button', { name: 'Save and continue' }).click()
  await prompt.getByText(`Review the initial order`).waitFor()
  assert.equal(await prompt.locator('ol li').first().textContent().then(text => text?.includes(pcName)), true)
  assert.equal(await prompt.locator('ol li').nth(1).textContent().then(text => text?.includes(npcName)), true)
  assert.equal(await prompt.locator('ol li').nth(2).textContent().then(text => text?.includes(mobName)), true)
  await prompt.getByRole('button', { name: 'Confirm and begin Fight' }).click()
  await preparedPc.locator('.active-label').waitFor()
  await page.getByRole('button', { name: 'Back to campaign' }).click()

  await page.getByLabel('Encounter name').fill(encounterName)
  await page.getByRole('button', { name: 'Create encounter' }).click()
  await page.locator('.encounter-detail').getByRole('heading', { name: encounterName }).waitFor()

  const characterForm = page.locator('.encounter-detail form').filter({ has: page.locator('[name="characterId"]') })
  await characterForm.locator('[name="characterId"]').selectOption({ label: `${pcName} (PC)` })
  await characterForm.getByLabel('Starting HP (optional)').fill('10.5')
  await characterForm.getByRole('button', { name: 'Add character' }).click()
  const pc = page.locator('.encounter-participants > li').filter({ hasText: pcName })
  await pc.waitFor()

  const mobForm = page.locator('.encounter-detail form').filter({ has: page.locator('[name="mobName"]') })
  await mobForm.getByLabel('Mob name').fill(mobName)
  await mobForm.getByLabel('Starting HP (optional)').fill('1.5')
  await mobForm.getByRole('button', { name: 'Add mob' }).click()
  const mob = page.locator('.encounter-participants > li').filter({ hasText: mobName })
  await mob.waitFor()
  assert.equal(await page.locator('.encounter-participants > li').count(), 2)

  await page.getByRole('button', { name: 'Begin Fight' }).click()
  await prompt.getByLabel(`Initiative for ${pcName}`).fill('18')
  await prompt.getByRole('button', { name: 'Save and continue' }).click()
  await prompt.getByLabel(`Initiative for ${mobName}`).fill('12')
  await prompt.getByRole('button', { name: 'Save and continue' }).click()
  await prompt.getByRole('button', { name: 'Confirm and begin Fight' }).click()
  await pc.locator('.active-label').waitFor()
  assert.equal(await pc.getByRole('button', { name: 'Set active' }).isDisabled(), true)
  assert.equal(await pc.getByText('Initiative:', { exact: false }).count(), 0)
  await pc.getByRole('button', { name: `Manage statuses for ${pcName}` }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Invisible' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Done' }).click()
  await pc.getByText('Invisible · 0').waitFor()
  assert.equal(await pc.getByRole('button', { name: 'Next', exact: true }).count(), 1)
  assert.equal(await mob.getByRole('button', { name: 'Next', exact: true }).count(), 0)
  assert.equal(await page.locator('.encounter-controls').getByRole('button', { name: 'Next' }).count(), 0)
  assert.equal(await page.getByRole('button', { name: 'Move up' }).count(), 0)
  assert.equal(await page.getByRole('button', { name: 'Move down' }).count(), 0)
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await mob.locator('.active-label').waitFor()
  await pc.getByText('Invisible · 1').waitFor()
  assert.equal(await pc.locator('.fight-tile-actions').getAttribute('open'), null)
  await mob.getByRole('button', { name: `Manage statuses for ${mobName}` }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Prone' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Done' }).click()
  assert.equal(await mob.getByRole('button', { name: 'Skip', exact: true }).count(), 1)
  assert.equal(await pc.getByRole('button', { name: 'Skip', exact: true }).count(), 0)
  await pc.getByText('Turns completed: 1', { exact: false }).waitFor()
  await page.getByRole('button', { name: 'Skip', exact: true }).click()
  await pc.locator('.active-label').waitFor()
  await page.locator('.encounter-detail').getByText('Round 2.', { exact: false }).waitFor()
  await mob.getByText('Prone · 0').waitFor()
  await page.reload()
  await page.locator('.campaign-list button').filter({ hasText: campaignName }).click()
  await page.locator('.encounter-list button').filter({ hasText: encounterName }).click()
  await mob.getByText('Prone · 0').waitFor()
  await pc.getByText('Invisible · 1').waitFor()
  await pc.getByRole('button', { name: `Remove Invisible from ${pcName}` }).click()
  await pc.getByText('Invisible · 1').waitFor({ state: 'detached' })

  assert.equal(await pc.locator('.fight-tile-actions').getAttribute('open'), '')
  const hpLine = pc.locator('.hp-input-line').first()
  assert.equal(await hpLine.locator(':scope > input').count(), 1)
  assert.equal(await hpLine.locator(':scope > button').textContent(), 'Save')
  const damageLine = pc.locator('.hp-input-line').nth(1)
  const healLine = pc.locator('.hp-input-line').nth(2)
  assert.equal(await damageLine.locator(':scope > input').count(), 1)
  assert.equal(await damageLine.locator(':scope > button').textContent(), 'Damage')
  assert.equal(await healLine.locator(':scope > input').count(), 1)
  assert.equal(await healLine.locator(':scope > button').textContent(), 'Heal')
  await pc.getByLabel('Damage amount').fill('20.5')
  await pc.getByRole('button', { name: 'Damage' }).click()
  await pc.locator('.alive-adjacent-label').waitFor()
  await pc.getByLabel('Heal amount').fill('0.5')
  await pc.getByRole('button', { name: 'Heal' }).click()
  await pc.locator('.dying-label').waitFor()

  await mob.locator('.fight-tile-actions summary').click()
  await mob.focus()
  const keyboardReorder = page.waitForResponse(response => response.url().endsWith('/reorder'))
  await page.keyboard.press('Alt+ArrowUp')
  assert.equal((await keyboardReorder).status(), 200)
  await pc.locator('.active-label').waitFor()
  await mob.getByRole('button', { name: 'Set active' }).click()
  await mob.locator('.active-label').waitFor()
  await page.getByRole('button', { name: 'Skip' }).click()
  await pc.locator('.active-label').waitFor()
  await page.locator('.encounter-detail').getByText('Round 2.', { exact: false }).waitFor()

  await mobForm.getByLabel('Mob name').fill(secondMobName)
  await mobForm.getByLabel('Starting HP (optional)').fill('3')
  await mobForm.getByRole('button', { name: 'Add mob' }).click()
  await page.locator('.encounter-participants > li').last().locator('strong')
    .filter({ hasText: secondMobName }).waitFor()
  assert.equal(await page.locator('.encounter-participants > li').last().locator('strong').textContent(), secondMobName)
  await pc.locator('.active-label').waitFor()

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
  await page.mouse.move(lateBounds.x + 10, lateBounds.y + 10)
  await page.mouse.down()
  await page.mouse.move(pcBounds.x + 10, pcBounds.y + 5, { steps: 12 })
  assert.equal(await page.locator('.fight-list > li.drop-before strong').textContent(), mobName)
  await page.mouse.up()
  const reorderResponse = await reordered
  if (!reorderResponse) {
    const events = await page.evaluate(() => window.__janusDragEvents)
    throw new Error(`Drag did not request reorder: ${events.join(', ')}`)
  }
  assert.equal(reorderResponse.status(), 200)
  await pc.locator('.active-label').waitFor()
  await page.locator('.encounter-participants > li').nth(1).locator('strong')
    .filter({ hasText: secondMobName }).waitFor()
  const lateBoundsAtMiddle = await lateMob.boundingBox()
  const mobBoundsAtEnd = await mob.boundingBox()
  assert.ok(lateBoundsAtMiddle && mobBoundsAtEnd)
  const reorderedAtEnd = page.waitForResponse(response => response.url().endsWith('/reorder'))
  await page.mouse.move(lateBoundsAtMiddle.x + 10, lateBoundsAtMiddle.y + 10)
  await page.mouse.down()
  await page.mouse.move(mobBoundsAtEnd.x + 10, mobBoundsAtEnd.y + mobBoundsAtEnd.height - 5, { steps: 12 })
  assert.equal(await page.locator('.fight-list > li.drop-end strong').textContent(), mobName)
  await page.mouse.up()
  assert.equal((await reorderedAtEnd).status(), 200)
  await page.locator('.encounter-participants > li').last().locator('strong')
    .filter({ hasText: secondMobName }).waitFor()
  await pc.locator('.active-label').waitFor()

  if (process.env.JANUS_TEST_STOP_AT_FIGHT === '1') {
    console.log(`Fight saved for restart check: ${campaignName} | ${encounterName} | ${pcName}`)
  } else {
    page.once('dialog', dialog => dialog.accept())
    await page.getByRole('button', { name: 'End encounter' }).click()
    await page.locator('.encounter-detail').getByText('Phase: Finished.', { exact: false }).waitFor()
    assert.equal(await page.locator('.encounter-detail').getByRole('button', { name: 'Save', exact: true }).count(), 0)

    await page.reload()
    await page.locator('.campaign-list button').filter({ hasText: campaignName }).click()
    await page.locator('.finished-group summary').click()
    await page.locator('.encounter-list button').filter({ hasText: encounterName }).click()
    await page.locator('.encounter-detail').getByText('Phase: Finished.', { exact: false }).waitFor()
    await page.locator('.encounter-participants > li').filter({ hasText: pcName })
      .locator('.dying-label').waitFor()
    assert.equal(await page.locator('.encounter-participants > li').count(), 3)
    await page.setViewportSize({ width: 640, height: 900 })
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false)
    console.log('Campaign, Fight, HP, drag-and-drop, Skip, insertion, and finished reload passed.')
  }
} finally {
  await browser.close()
}
