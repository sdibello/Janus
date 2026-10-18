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
const pcTypoName = `Browser PC typo ${suffix}`
const npcName = `Browser NPC ${suffix}`
const preparationName = `Initiative check ${suffix}`
const mobName = `Browser mob ${suffix}`
const secondMobName = `Late mob with a much longer participant name ${suffix}`
let encounterName = `Browser encounter ${suffix}`
const browser = await chromium.launch({
  channel: process.env.JANUS_TEST_BROWSER_CHANNEL ?? 'chrome',
  headless: true,
})

async function renameEncounter(page, submittedName, expectedName) {
  const detail = page.locator('.encounter-detail')
  await detail.getByRole('button', { name: 'Edit name' }).click()
  await detail.getByLabel('Encounter name').fill(submittedName)
  await detail.getByRole('button', { name: 'Save name' }).click()
  await detail.getByRole('heading', { name: expectedName, exact: true }).waitFor()
}

async function assertInactiveColumns(rows) {
  const layouts = []
  for (const row of rows) {
    const summary = await row.locator('.fight-participant-summary').boundingBox()
    const hp = await row.locator('.fight-hp-row').boundingBox()
    const actions = await row.locator('.condition-actions').boundingBox()
    const adjustment = await row.locator('.hp-adjustment-input').boundingBox()
    const damage = await row.getByRole('button', { name: 'Damage', exact: true }).boundingBox()
    const heal = await row.getByRole('button', { name: 'Heal', exact: true }).boundingBox()
    assert.ok(summary && hp && actions && adjustment && damage && heal, 'All three columns and HP controls must be visible')
    assert.ok(summary.x + summary.width <= hp.x + 1, 'Name and turns must precede HP without overlap')
    assert.ok(hp.x + hp.width <= actions.x + 1, 'HP must precede participant actions without overlap')
    assert.equal(await row.getByRole('button', { name: 'Set active', exact: true }).count(), 0)
    assert.equal(await row.getByRole('button', { name: 'Next', exact: true }).count(), 0)
    layouts.push({ summary, hp, actions, adjustment, damage, heal })
  }
  for (const layout of layouts.slice(1)) {
    for (const column of ['summary', 'hp', 'actions', 'adjustment', 'damage', 'heal']) {
      assert.ok(Math.abs(layout[column].x - layouts[0][column].x) <= 1,
        `${column} must align across inactive participants`)
    }
  }
}

async function assertActiveLayout(row) {
  assert.equal(await row.locator('.fight-participant-summary').count(), 1)
  const heading = await row.locator('.fight-tile-heading').boundingBox()
  const hp = await row.locator('.fight-hp-row').boundingBox()
  assert.ok(heading && hp, 'Active heading and HP controls must be visible')
  assert.ok(hp.y >= heading.y && hp.y + hp.height <= heading.y + heading.height + 1, 'Active HP controls must be inside the heading row')
  assert.equal(await row.getByRole('button', { name: 'Set active', exact: true }).count(), 0)
  assert.equal(await row.locator('.active-turn-row').getByRole('button', { name: 'Next', exact: true }).count(), 1)
  assert.equal(await row.getByRole('button', { name: 'Skip', exact: true }).count(), 1)
}

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

  await page.getByLabel('Character name').fill(pcTypoName)
  await page.getByRole('button', { name: 'Add character' }).first().click()
  const campaignPc = page.locator('.character-list').first().locator('li').first()
  await campaignPc.getByText(pcTypoName, { exact: true }).waitFor()
  await campaignPc.getByRole('button', { name: 'Edit name' }).click()
  await campaignPc.getByLabel('Character name').fill(pcName)
  await campaignPc.getByRole('button', { name: 'Save name' }).click()
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
  const preparedMob = page.locator('.encounter-participants > li').filter({ hasText: mobName })
  await preparedMob.waitFor()
  assert.equal(await preparedPc.locator('.participant-kind-icon').textContent(), 'PC')
  assert.equal(await preparedNpc.locator('.participant-kind-icon').textContent(), 'NPC')
  assert.equal(await preparedMob.locator('.participant-kind-icon').textContent(), 'MOB')
  assert.equal(await preparedPc.locator('small').count(), 0)
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
  await preparedPc.and(page.locator('.fight-list > li.active')).waitFor()
  await assertActiveLayout(preparedPc)
  await assertInactiveColumns([preparedNpc, preparedMob])
  for (const row of [preparedNpc, preparedMob]) {
    assert.equal(await row.locator('.fight-current-hp-form input').inputValue(), '')
    assert.equal(await row.getByRole('button', { name: 'Damage', exact: true }).isDisabled(), true)
    assert.equal(await row.getByRole('button', { name: 'Heal', exact: true }).isDisabled(), true)
  }
  await page.getByRole('button', { name: 'Back to campaign' }).click()

  await page.getByLabel('Encounter name').fill(encounterName)
  await page.getByRole('button', { name: 'Create encounter' }).click()
  await page.locator('.encounter-detail').getByRole('heading', { name: encounterName }).waitFor()
  const initialEncounterName = encounterName
  await page.locator('.encounter-detail').getByRole('button', { name: 'Edit name' }).click()
  await page.getByLabel('Encounter name').fill('Unsaved encounter name')
  await page.locator('.encounter-detail').getByRole('button', { name: 'Cancel' }).click()
  await page.locator('.encounter-detail').getByRole('heading', { name: initialEncounterName, exact: true }).waitFor()
  await page.locator('.encounter-detail').getByRole('button', { name: 'Edit name' }).click()
  await page.getByLabel('Encounter name').fill('   ')
  await page.locator('.encounter-detail').getByRole('button', { name: 'Save name' }).click()
  await page.getByRole('status').getByText('Encounter name is required.').waitFor()
  encounterName = `Prepared encounter ${suffix}`
  await page.getByLabel('Encounter name').fill(`  ${encounterName}  `)
  await page.locator('.encounter-detail').getByRole('button', { name: 'Save name' }).click()
  await page.locator('.encounter-detail').getByRole('heading', { name: encounterName, exact: true }).waitFor()

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
  await pc.and(page.locator('.fight-list > li.active')).waitFor()
  const fightEncounterName = `Fight encounter ${suffix}`
  await renameEncounter(page, fightEncounterName, fightEncounterName)
  encounterName = fightEncounterName
  assert.equal(await page.locator('.encounter-detail > .add-participant').count(), 0)
  assert.equal(await page.getByRole('heading', { name: 'Turn order' }).locator('..')
    .getByRole('button', { name: 'End encounter' }).count(), 1)
  assert.match(await page.locator('.held-section .section-help').getAttribute('title'), /Held participants wait outside/)
  assert.match(await page.locator('.turn-order-heading .section-help').getAttribute('title'), /Drag a participant/)
  assert.equal(await page.locator('.fight-list').getByRole('button', { name: 'Hold', exact: true }).count(), 0)
  assert.equal(await page.getByRole('button', { name: /^Manage statuses for/ }).count(), 0)
  assert.equal(await pc.getByRole('button', { name: 'Set active' }).count(), 0)
  assert.equal(await pc.locator('.fight-tile-actions').count(), 0)
  assert.equal(await pc.getByRole('textbox', { name: `HP adjustment for ${pcName}` }).count(), 1)
  assert.equal(await pc.locator('.fight-participant-summary .participant-kind-icon').textContent(), 'PC')
  await pc.getByText('HP: 10.5', { exact: true }).waitFor()
  await pc.getByRole('button', { name: `Edit current HP for ${pcName}` }).click()
  const pcCurrentHp = pc.getByRole('textbox', { name: `Current HP for ${pcName}` })
  await pcCurrentHp.fill('11.5')
  await pc.getByRole('button', { name: 'Save' }).click()
  await pc.getByText('HP: 11.5', { exact: true }).waitFor()
  assert.equal(await pcCurrentHp.count(), 0)
  await pc.getByRole('button', { name: `Edit current HP for ${pcName}` }).click()
  await pcCurrentHp.fill('10.5')
  await pc.getByRole('button', { name: 'Save' }).click()
  await pc.getByText('HP: 10.5', { exact: true }).waitFor()
  assert.equal(await pc.getByText('Initiative:', { exact: false }).count(), 0)
  assert.equal(await mob.locator('.fight-tile-actions').count(), 0)
  assert.equal(await mob.locator('.fight-participant-summary .participant-kind-icon').textContent(), 'MOB')
  await mob.getByRole('button', { name: `Edit current HP for ${mobName}` }).click()
  const mobCurrentHp = mob.getByRole('textbox', { name: `Current HP for ${mobName}` })
  await mobCurrentHp.fill('')
  const clearedHp = page.waitForResponse(response => response.url().endsWith('/hp'))
  await mob.getByRole('button', { name: 'Save' }).click()
  await clearedHp
  await mob.locator('.hp-adjust-button[value="damage"]:disabled').waitFor()
  assert.equal(await mob.getByRole('button', { name: 'Damage' }).isDisabled(), true)
  assert.equal(await mob.getByRole('button', { name: 'Heal' }).isDisabled(), true)
  await mobCurrentHp.fill('1.5')
  await mob.getByRole('button', { name: 'Save' }).click()
  await mob.getByText('HP: 1.5', { exact: true }).waitFor()
  const mobAdjustment = mob.getByRole('textbox', { name: `HP adjustment for ${mobName}` })
  await mobAdjustment.fill('0.5')
  await mob.getByRole('button', { name: 'Damage' }).click()
  await mob.getByText('HP: 1', { exact: true }).waitFor()
  assert.equal(await mobAdjustment.inputValue(), '')
  await mobAdjustment.fill('0.5')
  await mob.getByRole('button', { name: 'Heal' }).click()
  await mob.getByText('HP: 1.5', { exact: true }).waitFor()
  assert.equal(await mobAdjustment.inputValue(), '')
  const invisibleSaved = page.waitForResponse(response => response.request().method() === 'POST' && response.url().endsWith('/conditions'))
  await page.getByRole('region', { name: 'Statuses', exact: true }).getByRole('button', { name: 'Invisible', exact: true }).dragTo(pc)
  assert.equal((await invisibleSaved).status(), 200)
  await pc.getByText('Invisible · 0').waitFor()
  assert.equal(await pc.getByRole('button', { name: 'Next', exact: true }).count(), 1)
  assert.equal(await mob.getByRole('button', { name: 'Next', exact: true }).count(), 0)
  assert.equal(await page.locator('.encounter-controls').getByRole('button', { name: 'Next' }).count(), 0)
  assert.equal(await page.getByRole('button', { name: 'Move up' }).count(), 0)
  assert.equal(await page.getByRole('button', { name: 'Move down' }).count(), 0)
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await mob.and(page.locator('.fight-list > li.active')).waitFor()
  await assertActiveLayout(mob)
  await assertInactiveColumns([pc])
  await pc.getByText('Invisible · 1').waitFor()
  assert.equal(await pc.locator('.fight-tile-actions').count(), 0)
  const proneSaved = page.waitForResponse(response => response.request().method() === 'POST' && response.url().endsWith('/conditions'))
  await page.getByRole('region', { name: 'Statuses', exact: true }).getByRole('button', { name: 'Prone', exact: true }).dragTo(mob)
  assert.equal((await proneSaved).status(), 200)
  assert.equal(await mob.getByRole('button', { name: 'Skip', exact: true }).count(), 1)
  assert.equal(await pc.getByRole('button', { name: 'Skip', exact: true }).count(), 0)
  await pc.getByText('Turn: 1', { exact: true }).waitFor()
  await page.getByRole('button', { name: 'Skip', exact: true }).click()
  await pc.and(page.locator('.fight-list > li.active')).waitFor()
  await page.locator('.encounter-detail').getByText('Round 2.', { exact: false }).waitFor()
  await mob.getByText('Prone · 0').waitFor()
  await page.reload()
  await page.locator('.campaign-list button').filter({ hasText: campaignName }).click()
  await page.locator('.encounter-list button').filter({ hasText: encounterName }).click()
  await mob.getByText('Prone · 0').waitFor()
  await pc.getByText('Invisible · 1').waitFor()
  await pc.getByRole('button', { name: `Remove Invisible from ${pcName}` }).click()
  await pc.getByText('Invisible · 1').waitFor({ state: 'detached' })

  const pcAdjustment = pc.getByRole('textbox', { name: `HP adjustment for ${pcName}` })
  await pcAdjustment.fill('20.5')
  await pc.getByRole('button', { name: 'Damage' }).click()
  await pc.locator('.alive-adjacent-label').waitFor()
  assert.equal(await pcAdjustment.inputValue(), '')
  await pcAdjustment.fill('0.5')
  await pc.getByRole('button', { name: 'Heal' }).click()
  await pc.locator('.dying-label').waitFor()
  assert.equal(await pcAdjustment.inputValue(), '')

  assert.equal(await mob.locator('.fight-tile-actions').count(), 0)
  await pc.focus()
  const keyboardReorder = page.waitForResponse(response => response.url().endsWith('/reorder'))
  await page.keyboard.press('Alt+ArrowDown')
  assert.equal((await keyboardReorder).status(), 200)
  await pc.and(page.locator('.fight-list > li.active')).waitFor()
  await mob.focus()
  const madeActive = page.waitForResponse(response => response.url().endsWith('/reorder'))
  await page.keyboard.press('Alt+Home')
  assert.equal((await madeActive).status(), 200)
  await mob.and(page.locator('.fight-list > li.active')).waitFor()
  await page.getByRole('button', { name: 'Skip' }).click()
  await pc.and(page.locator('.fight-list > li.active')).waitFor()
  await page.locator('.encounter-detail').getByText('Round 2.', { exact: false }).waitFor()

  await page.getByRole('button', { name: 'Add Participant' }).click()
  const addDialog = page.getByRole('dialog', { name: 'Add a PC, NPC, or mob' })
  const fightMobForm = addDialog.locator('form').filter({ has: addDialog.locator('[name="mobName"]') })
  await fightMobForm.getByLabel('Mob name').fill(secondMobName)
  await fightMobForm.getByLabel('Starting HP (optional)').fill('3')
  await fightMobForm.getByRole('button', { name: 'Add mob' }).click()
  await addDialog.waitFor({ state: 'hidden' })
  await page.locator('.encounter-participants > li').last().locator('.fight-participant-summary > strong')
    .filter({ hasText: secondMobName }).waitFor()
  assert.equal(await page.locator('.encounter-participants > li').last().locator('.fight-participant-summary > strong').textContent(), secondMobName)
  await pc.and(page.locator('.fight-list > li.active')).waitFor()

  const lateMob = page.locator('.encounter-participants > li').filter({ hasText: secondMobName })
  await assertInactiveColumns([mob, lateMob])
  await lateMob.getByRole('button', { name: `Edit current HP for ${secondMobName}` }).click()
  const lateCurrentHp = lateMob.getByRole('textbox', { name: `Current HP for ${secondMobName}` })
  await lateCurrentHp.fill('4')
  await assertInactiveColumns([mob, lateMob])
  await lateMob.getByRole('button', { name: 'Save', exact: true }).click()
  await lateMob.getByText('HP: 4', { exact: true }).waitFor()
  await assertInactiveColumns([mob, lateMob])
  await lateMob.getByRole('button', { name: `Edit current HP for ${secondMobName}` }).click()
  await lateCurrentHp.fill('99')
  await lateMob.getByRole('button', { name: 'Cancel', exact: true }).click()
  await lateMob.getByText('HP: 4', { exact: true }).waitFor()
  await assertInactiveColumns([mob, lateMob])

  await page.setViewportSize({ width: 640, height: 3200 })
  await lateMob.getByRole('button', { name: `Edit current HP for ${secondMobName}` }).click()
  for (const row of [mob, lateMob]) {
    const summary = await row.locator('.fight-participant-summary').boundingBox()
    const hp = await row.locator('.fight-hp-row').boundingBox()
    const actions = await row.locator('.condition-actions').boundingBox()
    assert.ok(summary && hp && actions, 'Stacked groups must remain visible')
    assert.ok(hp.y >= summary.y + summary.height, 'HP must stack below name and turns')
    assert.ok(actions.y >= hp.y + hp.height, 'Participant actions must stack below HP')
  }
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false)
  await lateMob.getByRole('button', { name: 'Cancel', exact: true }).click()
  await page.setViewportSize({ width: 1280, height: 3200 })
  await assertInactiveColumns([mob, lateMob])
  await assertActiveLayout(pc)

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
  await pc.and(page.locator('.fight-list > li.active')).waitFor()
  await page.locator('.encounter-participants > li').nth(1).locator('.fight-participant-summary > strong')
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
  await page.locator('.encounter-participants > li').last().locator('.fight-participant-summary > strong')
    .filter({ hasText: secondMobName }).waitFor()
  await pc.and(page.locator('.fight-list > li.active')).waitFor()

  if (process.env.JANUS_TEST_STOP_AT_FIGHT === '1') {
    console.log(`Fight saved for restart check: ${campaignName} | ${encounterName} | ${pcName}`)
  } else {
    page.once('dialog', dialog => dialog.accept())
    await page.getByRole('button', { name: 'End encounter' }).click()
    await page.locator('.encounter-detail').getByText('Phase: Finished.', { exact: false }).waitFor()
    assert.equal(await page.locator('.encounter-detail').getByRole('button', { name: 'Save', exact: true }).count(), 0)
    assert.equal(await page.locator('.encounter-detail').getByRole('button', { name: 'Edit name' }).count(), 1)
    const finishedEncounterName = `Finished encounter ${suffix}`
    await renameEncounter(page, finishedEncounterName, finishedEncounterName)
    encounterName = finishedEncounterName

    await page.reload()
    await page.locator('.campaign-list button').filter({ hasText: campaignName }).click()
    await page.locator('.finished-group summary').click()
    const sourceDetailResponse = page.waitForResponse(response =>
      response.request().method() === 'GET' &&
      /\/campaigns\/[^/]+\/encounters\/[^/]+$/.test(new URL(response.url()).pathname))
    await page.locator('.encounter-list button').filter({ hasText: encounterName }).click()
    const sourceDetail = await sourceDetailResponse
    const source = await sourceDetail.json()
    await page.locator('.encounter-detail').getByText('Phase: Finished.', { exact: false }).waitFor()
    await page.locator('.encounter-participants > li').filter({ hasText: pcName })
      .locator('.dying-label').waitFor()
    assert.equal(await page.locator('.encounter-participants > li').count(), 3)
    await page.setViewportSize({ width: 640, height: 900 })
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth), false)

    const duplicateDetailResponse = page.waitForResponse(response =>
      response.request().method() === 'GET' &&
      /\/campaigns\/[^/]+\/encounters\/[^/]+$/.test(new URL(response.url()).pathname))
    await page.getByRole('button', { name: `Duplicate ${encounterName}` }).click()
    const duplicateDetail = await duplicateDetailResponse
    const copied = await duplicateDetail.json()
    await page.locator('.encounter-detail').getByRole('heading', { name: `Copy of ${encounterName}` }).waitFor()
    await page.locator('.encounter-detail').getByText('Phase: Prepare.', { exact: false }).waitFor()
    assert.equal(copied.phase, 'Prepare')
    assert.equal(copied.round, 1)
    assert.equal(copied.activeParticipantId, null)
    assert.equal(copied.participants.length, 3)
    const roster = (participants) => participants.map(participant =>
      participant.characterId ? `character:${participant.characterId}` : `mob:${participant.name}`).sort()
    assert.deepEqual(roster(copied.participants), roster(source.participants))
    assert.equal(copied.participants.every(participant =>
      !source.participants.some(sourceParticipant => sourceParticipant.id === participant.id)), true)
    assert.equal(copied.participants.every((participant, index) =>
      participant.initiative === null && participant.currentHp === null && participant.status === null &&
      participant.position === index && !participant.isHeld && participant.turnCount === 0 &&
      participant.conditions.length === 0), true)
    const renamedCopy = `Renamed copy ${suffix}`
    await renameEncounter(page, renamedCopy, renamedCopy)
    await page.getByRole('button', { name: 'Back to campaign' }).click()
    await page.locator('.encounter-list-actions').filter({ hasText: renamedCopy })
      .getByRole('button', { name: `${renamedCopy} Prepare` }).waitFor()
    await page.locator('.finished-group summary').click()
    await page.locator('.encounter-list-actions').filter({ hasText: encounterName })
      .getByRole('button', { name: new RegExp(`^${encounterName} Finished$`) }).click()
    await page.locator('.encounter-detail').getByText('Phase: Finished.', { exact: false }).waitFor()
    await page.locator('.encounter-participants > li').filter({ hasText: pcName })
      .locator('.dying-label').waitFor()
    console.log('Campaign, encounter rename/duplication, Fight columns, HP, drag-and-drop, Skip, insertion, and finished reload passed.')
  }
} finally {
  await browser.close()
}
