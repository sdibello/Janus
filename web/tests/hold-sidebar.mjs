import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'

// Exercise the built UI with isolated API fixtures; no account or database is used.
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

  for (const participant of participants) {
    await move(tile(participant), hold, 'hold')
    await held(participant).waitFor()
  }
  assert.equal(encounter.activeParticipantId, null)
  await page.locator('.empty-active-list').waitFor()
  await move(held(participants[1]), page.locator('.empty-active-list'), 'activate')
  await tile(participants[1]).locator('.active-label').waitFor()
  assert.equal(mutations.at(-1).body.targetIndex, 0)
  const keyboardRelease = page.waitForResponse(response => response.url().endsWith('/activate'))
  await held(participants[0]).focus()
  await page.keyboard.press('Enter')
  assert.equal((await keyboardRelease).status(), 200)
  await tile(participants[0]).waitFor()
  assert.equal(encounter.activeParticipantId, participants[1].id)
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
    assert.equal(await page.locator('.fight-board, .fight-hold-sidebar, .held-name').count(), 0)
    assert.equal(await hold.locator('.held-meta').count(), 1, `${phase} retains the detailed held row`)
  }
  assert.deepEqual(errors, [])
  console.log('Hold sidebar: width, compact tiles, drag/release, rejected saves, empty order, keyboard release, reload, and phase layouts passed (fixture API).')
} finally {
  await browser?.close()
  await new Promise(resolve => server.close(resolve))
}
