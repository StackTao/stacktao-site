const { JSDOM } = require('jsdom')
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict')
async function check(directory) {
  const dom = new JSDOM('<main id="root"><div id="wall"></div></main>', { url: 'https://stroke.test', runScripts: 'outside-only' })
  const w = dom.window, d = w.document, root = d.querySelector('#root'), wall = d.querySelector('#wall'), key = 'stroke-test'
  let wallWidth = 1000, top = 0, rectReads = 0, geometryReads = 0, sceneReads = 0, gradients = 0, blits = 0, saved, notes = [], syncs = 0
  Object.defineProperties(wall, { clientWidth: { get() { geometryReads++; return wallWidth } }, clientHeight: { get() { return 1000 } } })
  wall.getBoundingClientRect = () => { rectReads++; return { left: 0, top, width: wallWidth, height: 1000 } }
  const context = new Proxy({ createRadialGradient() { gradients++; return { addColorStop() {} } }, drawImage() { blits++ } }, { get: (o, k) => o[k] || (() => {}), set: (o, k, v) => (o[k] = v, true) })
  w.HTMLCanvasElement.prototype.getContext = () => context
  w.HTMLElement.prototype.setPointerCapture = () => {}
  Object.defineProperty(w, 'devicePixelRatio', { value: 2 })
  const getItem = w.Storage.prototype.getItem
  w.Storage.prototype.getItem = function(k) { if (k === key || k === key + '-positions-organic-v1') sceneReads++; return getItem.call(this, k) }
  let lock = Promise.resolve(), lockGate = null, frames = new Map(), nextFrame = 0
  w.navigator.locks = { request(name, callback) { const job = lock.then(() => lockGate).then(callback); lock = job.catch(() => {}); return job } }
  w.requestAnimationFrame = callback => { frames.set(++nextFrame, callback); return nextFrame }
  w.cancelAnimationFrame = id => frames.delete(id)
  w.setInterval = () => 0 // Keep the stationary-nozzle timer out of deterministic event counts.
  w.eval(fs.readFileSync(path.join(directory, 'js/wall-tools.js'), 'utf8'))
  const api = w.WallTools.mount({ root, wall, key, section: () => 0, read: () => notes, carve: () => d.createElement('svg'), sync() { syncs++ }, changed() {}, saved(note) { saved = note }, notice() {}, type() {} })
  const canvas = root.querySelector('.gb-free-layer canvas')
  function event(type, x, y, samples, pointerId = 1) { const e = new w.Event(type, { bubbles: true, cancelable: true }); Object.assign(e, { pointerId, button: 0, isPrimary: pointerId === 1, pointerType: 'pen', clientX: x, clientY: y, pressure: .6 }); if (samples) e.getCoalescedEvents = () => samples.map(p => ({ clientX: p[0], clientY: p[1], pressure: .6 })); canvas.dispatchEvent(e) }
  async function tick() { const current = [...frames.values()]; frames.clear(); current.forEach(fn => fn(0)); await new Promise(resolve => setImmediate(resolve)); await lock; await new Promise(resolve => setImmediate(resolve)) }
  async function finish() { root.querySelector('[data-action="finish"]').click(); await tick(); await new Promise(resolve => setImmediate(resolve)) }
  await api.start('ink')
  assert.equal(canvas.width, 2000, 'live raster uses device pixels while coordinates stay in wall units')
  sceneReads = rectReads = geometryReads = 0
  event('pointerdown', 100, 300)
  let expected = [[100, 300]], last
  for (let frame = 0; frame < 13; frame++) {
    const points = Array.from({ length: 200 }, (_, index) => { const i = frame * 200 + index + 1; return [100 + i * .25, 300 + Math.sin(i * .12) * 18] })
    last = points[points.length - 1]; expected.push(...points)
    event('pointermove', last[0], last[1], points); await tick()
  }
  event('pointerup', last[0] + 8, last[1] + 4); expected.push([last[0] + 8, last[1] + 4]); await tick()
  assert.equal(rectReads, 15, 'coalesced input reads layout once per event, not once per sample')
  assert.equal(geometryReads, 0, 'sampling does not repeatedly query layout width')
  assert.equal(sceneReads, 0, 'steady drawing does not reread the complete saved wall each frame')
  assert(gradients <= 8, 'thousands of stamps reuse at most eight pigment textures')
  assert(blits >= 2600, 'all accepted positions still paint; the speedup does not drop samples')
  await finish()
  assert(saved, 'a long stroke remains saveable beyond the former 2500-point silent stop')
  assert.equal(saved.strokes[0].points.length, expected.length)
  saved.strokes[0].points.forEach((p, i) => { assert(Math.abs(saved.frame.x + p[0] * saved.frame.width - expected[i][0]) < 1e-8); assert(Math.abs(saved.frame.y + p[1] * saved.frame.height - expected[i][1]) < 1e-8) })
  assert(!api.busy())
  const firstGradients = gradients
  w.WallTools.paintArt(saved); assert.equal(gradients, firstGradients, 'saved spray reuses the same deterministic pigment stamps')

  // An event that arrives while a reservation is waiting must retain its turns and final release point.
  await api.start('engraving'); let unlock; lockGate = new Promise(resolve => { unlock = resolve })
  event('pointerdown', 200, 500); const turn = [frames.values().next().value]; frames.clear(); turn.forEach(fn => fn(0))
  event('pointermove', 450, 500, [[250, 540], [300, 480], [350, 540], [400, 480], [450, 500]])
  event('pointerup', 470, 520); assert(api.busy()); unlock(); lockGate = null; await tick(); await tick(); await finish()
  assert.equal(saved.strokes[0].points.length, 7, 'queued sharp turns and release coordinates survive async reservation')

  // A second contact ending must not interrupt the active pen; its own end still does.
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    await api.start('engraving')
    event('pointerdown', 200, 500); event('pointerdown', 900, 900, null, 2)
    event('pointermove', 250, 500); event(type, 900, 900, null, 2)
    event('pointermove', 300, 500); event('pointerup', 350, 500); await tick(); await finish()
    assert.equal(saved.strokes.length, 1, 'a secondary contact does not create a stroke')
    assert.equal(saved.strokes[0].points.length, 4, type + ' from another pointer must preserve the held stroke and release point')
  }
  for (const type of ['pointercancel', 'lostpointercapture', 'blur']) {
    await api.start('engraving'); event('pointerdown', 200, 500); await tick()
    if (type === 'blur') w.dispatchEvent(new w.Event('blur')); else event(type, 200, 500)
    event('pointermove', 300, 500); event('pointerup', 350, 500); await tick(); await finish()
    assert.equal(saved.strokes[0].points.length, 1, type + ' still ends the active pointer without a phantom continuation')
  }

  // New notes and live peer leases still invalidate collision checks during a held stroke.
  await api.start('ink'); event('pointerdown', 100, 700); await tick()
  notes = [{ id: 'other', section: 0, medium: 'engraving', frame: { x: 400, y: 650, width: 10, height: 100 }, strokes: [{ width: 4, points: [[.5, 0], [.5, 1]] }] }]
  w.localStorage.setItem(key, JSON.stringify(notes)); w.dispatchEvent(new w.StorageEvent('storage', { key }))
  event('pointermove', 600, 700); await tick()
  assert(syncs > 0, 'cross-tab completed work refreshes the protected geometry during a stroke')
  assert(!root.querySelector('.gb-paint-warning').hidden, 'a fast sweep cannot pass through newly saved work')
  root.querySelector('[data-action="cancel"]').click(); await tick()
  notes = []; w.localStorage.setItem(key, '[]'); api.resize(); await api.start('ink')
  event('pointerdown', 100, 800); await tick()
  w.localStorage.setItem(key + '-live-leases', JSON.stringify({ peer: { wall: 0, expires: Date.now() + 15000, cells: [Math.floor(800 / 8) * 128 + Math.floor(400 / 8)] } }))
  event('pointermove', 600, 800); await tick(); assert(!root.querySelector('.gb-paint-warning').hidden, 'new sparse peer claims are checked on every paint batch')
  root.querySelector('[data-action="cancel"]').click(); await tick()
  w.localStorage.removeItem(key + '-live-leases'); wallWidth = 500; top = -100; api.resize(); await api.start('engraving')
  event('pointerdown', 100, 100); event('pointerup', 150, 150); await tick(); await finish()
  const a = saved.strokes[0].points[0]
  assert(Math.abs(saved.frame.x + a[0] * saved.frame.width - 200) < 1e-8)
  assert(Math.abs(saved.frame.y + a[1] * saved.frame.height - 400) < 1e-8, 'resize and scroll offsets still map to the exact clicked wall position')
  api.destroy(); w.close()
  console.log('PASS', directory, ': 2602 exact samples, 8 cached textures, 15 layout reads, zero steady-frame wall reads, release endpoint, delayed locks, pointer ownership, cancellation, fresh collisions, resize and scroll')
}
(async () => { for (const dir of process.argv.length > 2 ? process.argv.slice(2) : [path.join(__dirname, '../public')]) await check(dir) })().catch(error => { console.error(error); process.exit(1) })
