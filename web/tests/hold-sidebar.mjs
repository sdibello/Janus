import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'

// Exercise the built UI with isolated API fixtures; no account or database is used.
const catalog = JSON.parse(await readFile(new URL('../../shared/conditions.json', import.meta.url), 'utf8'))
const dist = fileURLToPath(new URL('../dist/', import.meta.url))
await readFile(resolve(dist, 'index.html'))
const server = createServer(async (request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname
  const file = resolve(dist, `.${pathname === '/' ? '/index.html' : pathname}`)
  if (!file.startsWith(dist.endsWith(sep) ? dist : `${dist}${sep}`)) {
    response.writeHead(403).end()
    return
  }
  try {
    const body = await readFile(file)
    response.writeHead(200, { 'content-type': {
      '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml',
    }[extname(file)] ?? 'application/octet-stream' }).end(body)
  } catch {
    response.writeHead(404).end()
  }
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
let browser
try {
  browser = await chromium.launch({
    ...(process.env.JANUS_TEST_BROWSER_CHANNEL ? { channel: process.env.JANUS_TEST_BROWSER_CHANNEL } : {}),
    headless: true,
  })
  const page = await browser.newPage({ viewport: { width: 1920, height: 1200 } })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  const campaign = { id: 'fixture-campaign', name: 'Sidebar test campaign', characters: [] }
  const participants = ['Active hero', 'Goblin', 'Ancient troll with an especially long name'].map((name, index) => ({
    id: `participant-${index}`, name, characterId: null, kind: 'Mob', initiative: `${20 - index}`,
    currentHp: `${10 + index}`, status: null, conditions: index === 1 ? [{ kind: 'Prone', turnCount: 2 }] : [],
    position: index, isHeld: false, turnCount: index + 1,
  }))
  const encounter = {
    id: 'fixture-encounter', campaignId: campaign.id, name: 'Sidebar test battle', phase: 'Fight',
    revision: 1, round: 4, activeParticipantId: participants[0].id, participants,
  }
  const snapshots = new Map(participants.map(participant => [participant.id, structuredClone(participant)]))
  const mutations = []
  let rejectNextHold = false
  let rejectNextCondition = false
  let rejectNextReorder = false
  const base = `/campaigns/${campaign.id}/encounters/${encounter.id}`
  await page.route(/http:\/\/localhost:(5186|5199)\//, async route => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    const json = value => route.fulfill({ json: value })
    if (path === '/health' || path === '/account/activity') return json({ status: 'ready' })
    if (path === '/auth/me') return json({ userName: 'Sidebar tester', userId: 'fixture-user' })
    if (path === '/campaigns') return json([campaign])
    if (path === `/campaigns/${campaign.id}`) return json(campaign)
    if (path === `/campaigns/${campaign.id}/encounters`) return json([encounter])
    if (path === base && request.method() === 'GET') return json(encounter)
    if (path === `${base}/reorder` && request.method() === 'POST') {
      const body = request.postDataJSON()
      assert.equal(body.revision, encounter.revision)
      assert.deepEqual([...body.orderedIds].sort(), encounter.participants.filter(item => !item.isHeld).map(item => item.id).sort())
      mutations.push({ path, body })
      if (rejectNextReorder) {
        rejectNextReorder = false
        return route.fulfill({ status: 409, json: { message: 'Fixture rejected the top drop.' } })
      }
      encounter.participants = [...body.orderedIds.map(id => participants.find(item => item.id === id)),
        ...participants.filter(item => item.isHeld)]
      if (body.makeActive) encounter.activeParticipantId = body.orderedIds[0]
      encounter.revision++
      return json(encounter)
    }
    const adjustmentMatch = path.match(/\/participants\/(participant-\d+)\/(damage|heal)$/)
    if (request.method() === 'POST' && adjustmentMatch) {
      const body = request.postDataJSON()
      assert.equal(body.revision, encounter.revision)
      const participant = participants.find(item => item.id === adjustmentMatch[1])
      participant.currentHp = String(Number(participant.currentHp) + Number(body.amount) * (adjustmentMatch[2] === 'heal' ? 1 : -1))
      const hp = Number(participant.currentHp)
      participant.status = hp <= -10 ? 'AliveAdjacent' : hp < 0 ? 'Dying' : hp === 0 ? 'Disabled' : null
      mutations.push({ path, body })
      encounter.revision++
      return json(encounter)
    }
    const conditionMatch = path.match(/\/participants\/(participant-\d+)\/conditions(?:\/([A-Za-z]+))?$/)
    if (request.method() === 'POST' && conditionMatch) {
      const body = request.postDataJSON()
      assert.equal(body.revision, encounter.revision)
      mutations.push({ path, body })
      if (rejectNextCondition) {
        rejectNextCondition = false
        return route.fulfill({ status: 409, json: { message: 'Fixture rejected the status change.' } })
      }
      assert.ok(catalog.some(item => item.kind === (conditionMatch[2] ?? body.kind)))
      const participant = participants.find(item => item.id === conditionMatch[1])
      if (conditionMatch[2]) participant.conditions = participant.conditions.filter(item => item.kind !== conditionMatch[2])
      else if (!participant.conditions.some(item => item.kind === body.kind))
        participant.conditions.push({ kind: body.kind, turnCount: 0 })
      encounter.revision++
      return json(encounter)
    }
    const match = path.match(/\/participants\/(participant-\d+)\/(hold|activate)$/)
    if (request.method() === 'POST' && match) {
      const body = request.postDataJSON()
      assert.equal(body.revision, encounter.revision, 'Moves must use the current saved revision')
      mutations.push({ path, body })
      if (match[2] === 'hold' && rejectNextHold) {
        rejectNextHold = false
        return route.fulfill({ status: 409, json: { message: 'Fixture rejected the Hold move.' } })
      }
      const participant = participants.find(item => item.id === match[1])
      participant.isHeld = match[2] === 'hold'
      if (!participant.isHeld) {
        const others = encounter.participants.filter(item => item.id !== participant.id && !item.isHeld)
        others.splice(body.targetIndex, 0, participant)
        encounter.participants = [...others, ...participants.filter(item => item.isHeld)]
      }
      if (body.makeActive) encounter.activeParticipantId = participant.id
      if (!encounter.activeParticipantId || participants.find(item => item.id === encounter.activeParticipantId).isHeld)
        encounter.activeParticipantId = encounter.participants.find(item => !item.isHeld)?.id ?? null
      encounter.revision++
      return json(encounter)
    }
    throw new Error(`Unexpected fixture request: ${request.method()} ${path}`)
  })
  const origin = `http://127.0.0.1:${server.address().port}`
  async function openBattle() {
    await page.goto(origin)
    await page.locator('.campaign-list button').filter({ hasText: campaign.name }).click()
    if (encounter.phase === 'Finished') await page.locator('.finished-group summary').click()
    await page.locator('.encounter-list button').filter({ hasText: encounter.name }).click()
    await page.locator('.encounter-detail h2').getByText(encounter.name).waitFor()
  }
  const tile = participant => page.locator('.fight-list > li').filter({ hasText: participant.name })
  const held = participant => page.getByRole('button', { name: `Release ${participant.name} to turn order`, exact: true })
  const hold = page.getByRole('region', { name: 'Hold list' })
  async function move(source, target, action, options) {
    const saved = page.waitForResponse(response => response.request().method() === 'POST' && response.url().endsWith(`/${action}`))
    await source.dragTo(target, options)
    assert.equal((await saved).status(), 200)
  }
  await openBattle()
  const listBounds = await page.locator('.fight-turn-order').boundingBox()
  const holdBounds = await hold.boundingBox()
  assert.ok(listBounds && holdBounds)
  assert.ok(Math.abs(listBounds.width - 1120) <= 1, 'Keep the existing maximum participant-list width')
  assert.ok(holdBounds.x > listBounds.x + listBounds.width, 'Hold must be to the right')
  assert.ok(Math.abs(holdBounds.width * 3 - listBounds.width) <= 1, 'Hold must take 25% of the two columns')
  for (const participant of participants) {
    const adjustment = tile(participant).getByRole('textbox', { name: `HP adjustment for ${participant.name}`, exact: true })
    const sizing = await adjustment.evaluate(input => {
      const style = getComputedStyle(input)
      const context = document.createElement('canvas').getContext('2d')
      context.font = style.font
      return {
        width: input.getBoundingClientRect().width,
        expected: context.measureText('0000').width + parseFloat(style.paddingLeft) + parseFloat(style.paddingRight)
          + parseFloat(style.borderLeftWidth) + parseFloat(style.borderRightWidth),
      }
    })
    assert.ok(Math.abs(sizing.width - sizing.expected) <= 1, 'HP adjustment should fit four characters plus padding and borders')
    await adjustment.fill('1234')
    assert.equal(await adjustment.inputValue(), '1234')
    await adjustment.fill('')
  }
  assert.equal(await page.getByRole('button', { name: 'Set active', exact: true }).count(), 0)
  const beforeActivation = encounter.participants.map(item => item.id)
  const topOptions = { targetPosition: { x: 10, y: 2 } }
  rejectNextReorder = true
  const rejectedTop = page.waitForResponse(response => response.url().endsWith('/reorder'))
  await tile(participants[1]).dragTo(tile(participants[0]), topOptions)
  assert.equal((await rejectedTop).status(), 409)
  await page.getByRole('status').getByText('Fixture rejected the top drop.').waitFor()
  assert.deepEqual(encounter.participants.map(item => item.id), beforeActivation)
  assert.equal(encounter.activeParticipantId, participants[0].id)
  await move(tile(participants[1]), tile(participants[0]), 'reorder', topOptions)
  await tile(participants[1]).and(page.locator('.fight-list > li.active')).waitFor()
  assert.equal(mutations.at(-1).body.makeActive, true)
  assert.equal(await page.locator('.fight-list > li').first().locator('.fight-participant-summary > strong').textContent(), participants[1].name)
  const restoredActive = page.waitForResponse(response => response.url().endsWith('/reorder'))
  await tile(participants[0]).focus()
  await page.keyboard.press('Alt+Home')
  assert.equal((await restoredActive).status(), 200)
  await tile(participants[0]).and(page.locator('.fight-list > li.active')).waitFor()
  assert.deepEqual(encounter.participants.map(item => item.id), beforeActivation)
  await move(tile(participants[2]), tile(participants[1]), 'reorder', topOptions)
  assert.equal(mutations.at(-1).body.makeActive, false, 'Ordinary drop slots must preserve active selection')
  assert.equal(encounter.activeParticipantId, participants[0].id)
  await move(tile(participants[1]), tile(participants[2]), 'reorder', topOptions)
  assert.deepEqual(encounter.participants.map(item => item.id), beforeActivation)
  for (const participant of participants) {
    const row = tile(participant)
    const layout = await row.evaluate(element => {
      const summary = element.querySelector('.fight-participant-summary').getBoundingClientRect()
      const input = element.querySelector('.hp-adjustment-input').getBoundingClientRect()
      const hp = element.querySelector('.fight-current-hp-display').getBoundingClientRect()
      const damage = element.querySelector('button[value="damage"]').getBoundingClientRect()
      const heal = element.querySelector('button[value="heal"]').getBoundingClientRect()
      const name = element.querySelector('strong')
      return { summaryY: summary.y, summaryBottom: summary.bottom, inputY: input.y, inputHeight: input.height,
        inputX: input.x, inputRight: input.right, hpX: hp.x, hpRight: hp.right, damageX: damage.x,
        damageHeight: damage.height, healHeight: heal.height, nameOverflow: getComputedStyle(name).textOverflow,
        nameWhiteSpace: getComputedStyle(name).whiteSpace, title: name.title }
    })
    assert.ok(layout.inputY >= layout.summaryY - 5 && layout.inputY <= layout.summaryBottom, 'All participant HP controls share the name row')
    assert.ok(layout.hpRight <= layout.inputX && Math.abs(layout.damageX - layout.inputRight - 8) <= 1,
      'HP display/editor must precede the adjustment box, which sits immediately before Damage')
    assert.ok(layout.inputHeight <= 30 && layout.damageHeight <= 30 && layout.healHeight <= 30, 'Adjustment controls must be compact')
    assert.equal(layout.nameOverflow, 'ellipsis')
    assert.equal(layout.nameWhiteSpace, 'nowrap')
    assert.equal(layout.title, participant.name)
  }
  const longName = await tile(participants[2]).locator('.fight-participant-summary > strong').evaluate(element => ({
    width: element.clientWidth, content: element.scrollWidth,
  }))
  assert.ok(longName.content > longName.width, 'A long name must truncate within the fixed name column')
  assert.equal(await page.locator('.active-label').count(), 0, 'Do not show an Active turn bubble')
  assert.equal(await page.locator('.fight-list > li[aria-current="true"]').count(), 1)
  const nameAllocation = await tile(participants[0]).evaluate(row => {
    return row.querySelector('.fight-participant-summary').getBoundingClientRect().width
      / row.querySelector('.fight-row-heading').getBoundingClientRect().width
  })
  assert.ok(nameAllocation > 0.3, 'The name column must be wider than the previous one-quarter allocation')
  const adjustment = tile(participants[0]).getByRole('textbox', { name: `HP adjustment for ${participants[0].name}`, exact: true })
  await adjustment.fill('2')
  const damaged = page.waitForResponse(response => response.url().endsWith('/damage'))
  await tile(participants[0]).getByRole('button', { name: 'Damage', exact: true }).click()
  assert.equal((await damaged).status(), 200)
  await tile(participants[0]).getByText('HP: 8', { exact: true }).waitFor()
  assert.equal(await adjustment.inputValue(), '')
  await adjustment.fill('2')
  const healed = page.waitForResponse(response => response.url().endsWith('/heal'))
  await tile(participants[0]).getByRole('button', { name: 'Heal', exact: true }).click()
  assert.equal((await healed).status(), 200)
  await tile(participants[0]).getByText('HP: 10', { exact: true }).waitFor()
  assert.equal(await adjustment.inputValue(), '')
  for (const step of [
    { action: 'Damage', amount: '11', label: 'Dying', className: 'dying-label', color: 'rgb(245, 186, 126)' },
    { action: 'Heal', amount: '1', label: 'Disabled', className: 'disabled-label', color: 'rgb(245, 223, 119)' },
    { action: 'Damage', amount: '10', label: 'alive adjacent', className: 'alive-adjacent-label', color: 'rgb(232, 170, 163)' },
  ]) {
    await adjustment.fill(step.amount)
    const saved = page.waitForResponse(response => response.url().endsWith(`/${step.action.toLowerCase()}`))
    await tile(participants[0]).getByRole('button', { name: step.action, exact: true }).click()
    assert.equal((await saved).status(), 200)
    const badge = tile(participants[0]).locator(`.condition-actions > .${step.className}`)
    await badge.getByText(step.label, { exact: true }).waitFor()
    assert.equal(await badge.evaluate(element => getComputedStyle(element).backgroundColor), step.color)
    const badgeBounds = await badge.boundingBox()
    const hpBounds = await tile(participants[0]).locator('.fight-hp-row').boundingBox()
    assert.ok(badgeBounds.x >= hpBounds.x + hpBounds.width, 'HP-derived badges belong at the right end with the other statuses')
    assert.equal(await tile(participants[0]).locator('.fight-hp-row .hp-status').count(), 0)
  }
  await adjustment.fill('20')
  const restoreHp = page.waitForResponse(response => response.url().endsWith('/heal'))
  await tile(participants[0]).getByRole('button', { name: 'Heal', exact: true }).click()
  assert.equal((await restoreHp).status(), 200)
  await tile(participants[0]).getByText('HP: 10', { exact: true }).waitFor()
  const palette = page.getByRole('region', { name: 'Statuses', exact: true })
  const paletteBounds = await palette.boundingBox()
  assert.ok(paletteBounds.y >= holdBounds.y + holdBounds.height, 'Statuses must sit under Hold')
  assert.ok(Math.abs(paletteBounds.x - holdBounds.x) <= 1, 'Statuses must share the Hold column')
  assert.equal(await palette.getByRole('button').count(), catalog.length)
  assert.equal(catalog.length, 42)
  assert.equal(catalog.filter(item => item.core).length, 38)
  assert.equal(await page.locator('.fight-list').getByRole('button', { name: 'Hold', exact: true }).count(), 0)
  assert.equal(await page.getByRole('button', { name: /^Manage statuses for/ }).count(), 0)
  const originalOrder = encounter.participants.map(item => item.id)
  async function dropStatus(kind, participant) {
    const definition = catalog.find(item => item.kind === kind)
    await palette.getByRole('searchbox', { name: 'Filter statuses', exact: true }).fill(definition.label)
    const saved = page.waitForResponse(response => response.request().method() === 'POST' && response.url().endsWith('/conditions'))
    await palette.getByRole('button', { name: definition.label, exact: true }).dragTo(tile(participant))
    assert.equal((await saved).status(), 200)
    assert.equal(mutations.at(-1).path, `${base}/participants/${participant.id}/conditions`)
    assert.equal(mutations.at(-1).body.kind, kind)
    await tile(participant).getByText(`${definition.label} · 0`, { exact: false }).waitFor()
    await palette.getByRole('searchbox', { name: 'Filter statuses', exact: true }).fill('')
    assert.deepEqual(encounter.participants.map(item => item.id), originalOrder, 'Status drops must not reorder participants')
    assert.equal(encounter.activeParticipantId, participants[0].id)
    assert.equal(encounter.round, 4)
  }
  await dropStatus('Invisible', participants[0])
  const activeSummary = page.getByRole('region', { name: `Status effects for ${participants[0].name}`, exact: true })
  await activeSummary.getByText(catalog.find(item => item.kind === 'Invisible').summary, { exact: false }).waitFor()
  assert.equal(await tile(participants[1]).locator('.active-turn-row').count(), 0)
  const secondLine = await tile(participants[0]).locator('.active-turn-row').boundingBox()
  const firstLine = await tile(participants[0]).locator('.fight-tile-heading').boundingBox()
  assert.ok(secondLine.y >= firstLine.y + firstLine.height, 'Turn actions and effect summaries belong below the heading')
  assert.equal(await tile(participants[0]).locator('.active-turn-row').getByRole('button', { name: 'Next', exact: true }).count(), 1)
  assert.equal(await tile(participants[0]).locator('.active-turn-row').getByRole('button', { name: 'Skip', exact: true }).count(), 1)
  await dropStatus('Grappled', participants[1])
  await dropStatus('Prone', participants[2])
  const beforeDuplicate = mutations.length
  await palette.getByRole('button', { name: 'Prone', exact: true }).dragTo(tile(participants[1]))
  assert.equal(mutations.length, beforeDuplicate, 'Reapplying a status must be a no-op')
  await tile(participants[1]).getByText('Prone · 2', { exact: false }).waitFor()
  const beforeWrongTarget = mutations.length
  await palette.getByRole('button', { name: 'Invisible', exact: true }).dragTo(hold)
  assert.equal(mutations.length, beforeWrongTarget, 'A status must not be interpreted as a participant drag')
  rejectNextCondition = true
  const rejectedCondition = page.waitForResponse(response => response.url().endsWith('/conditions'))
  await palette.getByRole('button', { name: 'Invisible', exact: true }).dragTo(tile(participants[2]))
  assert.equal((await rejectedCondition).status(), 409)
  await page.getByRole('status').getByText('Fixture rejected the status change.').waitFor()
  assert.equal(await tile(participants[2]).getByText('Invisible · 0', { exact: false }).count(), 0)
  await openBattle()
  await tile(participants[0]).getByText('Invisible · 0', { exact: false }).waitFor()
  async function removeStatus(kind, participant) {
    const label = catalog.find(item => item.kind === kind).label
    const saved = page.waitForResponse(response => response.url().endsWith(`/conditions/${kind}`))
    await tile(participant).getByRole('button', { name: `Remove ${label} from ${participant.name}`, exact: true }).click()
    assert.equal((await saved).status(), 200)
    await tile(participant).getByText(`${label} · 0`, { exact: false }).waitFor({ state: 'detached' })
  }
  for (const kind of ['Blinded', 'Dazed', 'FlatFooted', 'Poisoned', 'Stable', 'Dead']) {
    await dropStatus(kind, participants[0])
    await activeSummary.getByText(catalog.find(item => item.kind === kind).summary, { exact: false }).waitFor()
    assert.equal(await tile(participants[0]).getByRole('button', { name: 'Next', exact: true }).isEnabled(), true,
      'Status reminders must not automatically prevent turn actions')
    await removeStatus(kind, participants[0])
  }
  await palette.getByRole('searchbox', { name: 'Filter statuses', exact: true }).fill('bLiNd')
  assert.equal(await palette.getByRole('button').count(), 1)
  await palette.getByRole('button', { name: 'Blinded', exact: true }).waitFor()
  await palette.getByRole('searchbox', { name: 'Filter statuses', exact: true }).fill('')
  await removeStatus('Invisible', participants[0])
  const keyboardCondition = page.waitForResponse(response => response.url().endsWith('/conditions'))
  await palette.getByRole('button', { name: 'Invisible', exact: true }).click()
  await tile(participants[0]).focus()
  await page.keyboard.press('Enter')
  assert.equal((await keyboardCondition).status(), 200)
  await tile(participants[0]).getByText('Invisible · 0', { exact: false }).waitFor()
  await removeStatus('Invisible', participants[0])
  await removeStatus('Grappled', participants[1])
  await removeStatus('Prone', participants[2])
  await tile(participants[1]).getByRole('button', { name: `Edit current HP for ${participants[1].name}` }).click()
  const hpPositions = await page.locator('.inactive-fight-heading > .fight-hp-row').evaluateAll(rows =>
    rows.map(row => row.getBoundingClientRect().x))
  assert.ok(Math.abs(hpPositions[0] - hpPositions[1]) <= 1, 'Inactive HP columns must still align')
  await tile(participants[1]).getByRole('button', { name: 'Cancel', exact: true }).click()

  rejectNextHold = true
  const rejected = page.waitForResponse(response => response.url().endsWith('/hold'))
  await tile(participants[1]).dragTo(hold)
  assert.equal((await rejected).status(), 409)
  await page.getByRole('status').getByText('Fixture rejected the Hold move.').waitFor()
  await tile(participants[1]).waitFor()
  assert.equal(await hold.locator('.held-list > li').count(), 0)

  await move(tile(participants[1]), hold, 'hold')
  await held(participants[1]).waitFor()
  assert.equal(await hold.locator('.held-list > li').first().textContent().then(text => text.trim()), participants[1].name)
  assert.equal(await hold.locator('.held-meta, .participant-kind-icon, input').count(), 0)
  assert.equal(encounter.activeParticipantId, participants[0].id)
  await openBattle()
  await held(participants[1]).waitFor()
  const target = tile(participants[2])
  const targetBounds = await target.boundingBox()
  await move(held(participants[1]), target, 'activate', { targetPosition: { x: 10, y: targetBounds.height - 5 } })
  await tile(participants[1]).waitFor()
  assert.equal(mutations.at(-1).body.targetIndex, 2, 'Release at the indicated end slot')
  assert.equal(encounter.activeParticipantId, participants[0].id)

  await move(tile(participants[1]), hold, 'hold')
  await held(participants[1]).waitFor()
  await move(held(participants[1]), tile(participants[0]), 'activate', topOptions)
  await tile(participants[1]).and(page.locator('.fight-list > li.active')).waitFor()
  assert.equal(mutations.at(-1).body.makeActive, true, 'Releasing at the top must make the held participant active')
  const restoreAfterRelease = page.waitForResponse(response => response.url().endsWith('/reorder'))
  await tile(participants[0]).focus()
  await page.keyboard.press('Alt+Home')
  assert.equal((await restoreAfterRelease).status(), 200)
  await tile(participants[0]).and(page.locator('.fight-list > li.active')).waitFor()

  for (const participant of participants) {
    await move(tile(participant), hold, 'hold')
    await held(participant).waitFor()
  }
  assert.equal(encounter.activeParticipantId, null)
  await page.locator('.empty-active-list').waitFor()
  await move(held(participants[1]), page.locator('.empty-active-list'), 'activate')
  await tile(participants[1]).and(page.locator('.fight-list > li.active')).waitFor()
  assert.equal(mutations.at(-1).body.targetIndex, 0)
  const keyboardRelease = page.waitForResponse(response => response.url().endsWith('/activate'))
  await held(participants[0]).focus()
  await page.keyboard.press('Enter')
  assert.equal((await keyboardRelease).status(), 200)
  await tile(participants[0]).waitFor()
  assert.equal(encounter.activeParticipantId, participants[1].id)
  const keyboardHold = page.waitForResponse(response => response.url().endsWith('/hold'))
  await tile(participants[0]).focus()
  await page.keyboard.press('Alt+h')
  assert.equal((await keyboardHold).status(), 200)
  await held(participants[0]).waitFor()
  const releaseAgain = page.waitForResponse(response => response.url().endsWith('/activate'))
  await held(participants[0]).click()
  assert.equal((await releaseAgain).status(), 200)
  await tile(participants[0]).waitFor()
  assert.equal(encounter.round, 4)
  for (const participant of participants) {
    const before = snapshots.get(participant.id)
    assert.equal(participant.currentHp, before.currentHp)
    assert.equal(participant.turnCount, before.turnCount)
    assert.deepEqual(participant.conditions, before.conditions)
  }
  await page.setViewportSize({ width: 1280, height: 1200 })
  const narrowList = await page.locator('.fight-turn-order').boundingBox()
  const narrowHold = await hold.boundingBox()
  assert.ok(Math.abs(narrowList.width - 1120) <= 1, 'Stack Hold rather than shrink the participant list')
  assert.ok(narrowHold.y >= narrowList.y + narrowList.height, 'Hold stacks below on smaller displays')
  await page.setViewportSize({ width: 640, height: 1200 })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
  for (const phase of ['Finished', 'Prepare']) {
    encounter.phase = phase
    await openBattle()
    assert.equal(await page.locator('.fight-board, .fight-hold-sidebar, .held-name, .status-palette').count(), 0)
    assert.equal(await hold.locator('.held-meta').count(), 1, `${phase} retains the detailed held row`)
  }
  assert.deepEqual(errors, [])
  console.log('Battle sidebar: compact inline HP controls, atomic top-drop activation, status drag/apply/remove, duplicate and rejected statuses, keyboard apply, Hold drag/release, width, empty order, reload, and phase layouts passed (fixture API).')
} finally {
  await browser?.close()
  await new Promise(resolve => server.close(resolve))
}
