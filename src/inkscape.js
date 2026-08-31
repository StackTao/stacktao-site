function mulberry32(seed) {
  return function random() {
    let value = seed += 0x6d2b79f5
    value = Math.imul(value ^ value >>> 15, value | 1)
    value ^= value + Math.imul(value ^ value >>> 7, value | 61)
    return ((value ^ value >>> 14) >>> 0) / 4294967296
  }
}

function smoothstep(value) {
  const clamped = Math.max(0, Math.min(1, value))
  return clamped * clamped * (3 - 2 * clamped)
}

function mountainPath(ctx, points, baseline) {
  ctx.beginPath()
  ctx.moveTo(points[0].x, baseline)
  ctx.lineTo(points[0].x, points[0].y)
  for (let index = 1; index < points.length - 1; index += 1) {
    const current = points[index]
    const next = points[index + 1]
    const midX = (current.x + next.x) / 2
    const midY = (current.y + next.y) / 2
    ctx.quadraticCurveTo(current.x, current.y, midX, midY)
  }
  const last = points.at(-1)
  ctx.lineTo(last.x, last.y)
  ctx.lineTo(last.x, baseline)
  ctx.closePath()
}

export function initInkScene(canvas) {
  if (!canvas?.getContext) return
  const ctx = canvas.getContext('2d')
  const seedArray = new Uint32Array(1)
  crypto.getRandomValues(seedArray)
  const seed = seedArray[0]
  let random = mulberry32(seed)
  let width = 1
  let height = 1
  let dpr = 1
  let mountains = []
  let raf = 0
  let birdTimer = 0
  let birdEvent = null
  let startedAt = performance.now()
  let sceneSettled = false
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')

  function isDark() {
    return document.documentElement.classList.contains('dark')
  }

  function makePoints(layer) {
    const count = Math.max(9, Math.round(width / 150))
    const points = []
    let previous = layer.base - layer.height * (0.28 + random() * 0.25)
    for (let index = 0; index <= count; index += 1) {
      const x = -width * 0.08 + (width * 1.16 * index) / count
      const target = layer.base - layer.height * (0.18 + random() * 0.82)
      const y = index === 0 || index === count
        ? layer.base - layer.height * 0.12
        : previous * 0.5 + target * 0.5
      previous = y
      points.push({ x, y })
    }
    return points
  }

  function buildScene() {
    random = mulberry32(seed)
    const layers = [
      { base: height * 0.78, height: height * 0.16, alpha: 0.016, delay: 0 },
      { base: height * 0.87, height: height * 0.21, alpha: 0.024, delay: 420 },
      { base: height * 0.97, height: height * 0.25, alpha: 0.032, delay: 860 },
    ]
    mountains = layers.map((layer) => ({ ...layer, points: makePoints(layer) }))
    startedAt = performance.now()
    sceneSettled = reduced.matches
  }

  function drawCelestial(alpha) {
    const dark = isDark()
    random = mulberry32(seed ^ 0x9e3779b9)
    const show = random() < (dark ? 0.58 : 0.34)
    if (!show) return
    const x = width * (0.66 + random() * 0.2)
    const y = height * (0.15 + random() * 0.14)
    const radius = Math.max(10, Math.min(19, width * 0.015))
    const color = dark ? '232,226,207' : '157,52,39'
    ctx.save()
    for (let pass = 0; pass < 6; pass += 1) {
      const offsetX = (random() - 0.5) * 2.6
      const offsetY = (random() - 0.5) * 2.2
      ctx.beginPath()
      ctx.arc(x + offsetX, y + offsetY, radius * (0.88 + random() * 0.13), 0, Math.PI * 2)
      ctx.fillStyle = `rgba(${color},${alpha * (dark ? 0.018 : 0.014)})`
      ctx.fill()
    }
    if (dark && random() > 0.34) {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.beginPath()
      ctx.arc(x + radius * (0.35 + random() * 0.28), y - radius * 0.08, radius * (0.83 + random() * 0.16), 0, Math.PI * 2)
      ctx.fillStyle = `rgba(0,0,0,${alpha * 0.86})`
      ctx.fill()
    }
    ctx.restore()
  }

  function drawLayer(layer, progress, index) {
    const alpha = layer.alpha * progress
    const ink = isDark() ? '231,226,212' : '33,30,25'
    ctx.save()
    mountainPath(ctx, layer.points, height + 30)
    ctx.clip()

    for (let wash = 0; wash < 4; wash += 1) {
      ctx.save()
      ctx.translate((wash - 1.5) * 2.2, wash * 2.5)
      mountainPath(ctx, layer.points, height + 30)
      ctx.fillStyle = `rgba(${ink},${alpha * (0.38 - wash * 0.055)})`
      ctx.fill()
      ctx.restore()
    }

    random = mulberry32(seed + index * 971)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    for (let stroke = 0; stroke < 18; stroke += 1) {
      const y = layer.base - layer.height * (0.06 + random() * 0.72)
      const startX = -20 + random() * width * 0.9
      const length = width * (0.08 + random() * 0.2)
      ctx.beginPath()
      ctx.moveTo(startX, y)
      ctx.bezierCurveTo(
        startX + length * 0.25,
        y - 5 + random() * 12,
        startX + length * 0.72,
        y + 7 - random() * 14,
        startX + length,
        y + (random() - 0.5) * 9,
      )
      ctx.strokeStyle = `rgba(${ink},${alpha * (0.7 + random() * 0.6)})`
      ctx.lineWidth = 0.45 + random() * 0.8
      ctx.stroke()
    }
    ctx.restore()

    ctx.save()
    ctx.beginPath()
    const points = layer.points
    ctx.moveTo(points[0].x, points[0].y)
    for (let point = 1; point < points.length - 1; point += 1) {
      const current = points[point]
      const next = points[point + 1]
      ctx.quadraticCurveTo(current.x, current.y, (current.x + next.x) / 2, (current.y + next.y) / 2)
    }
    ctx.lineTo(points.at(-1).x, points.at(-1).y)
    ctx.strokeStyle = `rgba(${ink},${alpha * 1.4})`
    ctx.lineWidth = 0.65 + index * 0.22
    ctx.stroke()
    ctx.restore()
  }

  function drawMist(alpha) {
    const paper = isDark() ? '20,19,16' : '245,242,234'
    ctx.save()
    ctx.lineCap = 'round'
    for (let band = 0; band < 3; band += 1) {
      const y = height * (0.69 + band * 0.09)
      ctx.beginPath()
      ctx.moveTo(-40, y)
      ctx.bezierCurveTo(width * 0.26, y - 12, width * 0.58, y + 15, width + 40, y - 4)
      ctx.strokeStyle = `rgba(${paper},${alpha * (0.18 - band * 0.03)})`
      ctx.lineWidth = 18 + band * 7
      ctx.stroke()
    }
    ctx.restore()
  }

  function drawBird(x, y, scale, phase, alpha) {
    const ink = isDark() ? '225,220,207' : '38,35,30'
    const wing = Math.sin(phase) * scale * 0.18
    ctx.save()
    ctx.translate(x, y)
    ctx.beginPath()
    ctx.moveTo(-scale, wing)
    ctx.quadraticCurveTo(-scale * 0.42, -scale * 0.48 - wing, 0, 0)
    ctx.quadraticCurveTo(scale * 0.42, -scale * 0.42 + wing, scale, wing * 0.7)
    ctx.strokeStyle = `rgba(${ink},${alpha})`
    ctx.lineWidth = Math.max(0.55, scale * 0.075)
    ctx.lineCap = 'round'
    ctx.stroke()
    ctx.restore()
  }

  function drawBirds(now) {
    if (!birdEvent) return false
    const progress = (now - birdEvent.startedAt) / birdEvent.duration
    if (progress >= 1) {
      birdEvent = null
      scheduleBirds()
      return false
    }
    const eased = smoothstep(Math.min(1, progress / 0.12)) * smoothstep(Math.min(1, (1 - progress) / 0.16))
    birdEvent.birds.forEach((bird, index) => {
      const offset = index * 0.028
      const t = Math.max(0, Math.min(1, progress - offset))
      const x = birdEvent.direction > 0
        ? -80 + (width + 160) * t
        : width + 80 - (width + 160) * t
      const y = bird.y + Math.sin(t * Math.PI * 2 + bird.phase) * bird.drift
      drawBird(x, y, bird.scale, t * 5 + bird.phase, eased * bird.alpha)
    })
    return true
  }

  function render(now = performance.now()) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, width, height)
    const elapsed = reduced.matches ? 4200 : now - startedAt
    drawCelestial(smoothstep(elapsed / 1400))
    mountains.forEach((layer, index) => {
      const progress = smoothstep((elapsed - layer.delay) / 2600)
      drawLayer(layer, progress, index)
    })
    drawMist(smoothstep((elapsed - 800) / 2600))
    const birdsActive = drawBirds(now)
    const painting = elapsed < 3900
    sceneSettled = !painting
    if (painting || birdsActive) raf = requestAnimationFrame(render)
    else raf = 0
  }

  function startBirds() {
    if (reduced.matches || document.hidden) {
      scheduleBirds()
      return
    }
    random = mulberry32((seed ^ Date.now()) >>> 0)
    const dark = isDark()
    const count = dark ? 1 + Math.floor(random() * 3) : 3 + Math.floor(random() * 5)
    const direction = random() > 0.5 ? 1 : -1
    const baseY = height * (0.16 + random() * 0.23)
    birdEvent = {
      startedAt: performance.now(),
      duration: 24000 + random() * 12000,
      direction,
      birds: Array.from({ length: count }, (_, index) => ({
        y: baseY + (index % 2 ? 1 : -1) * index * (5 + random() * 5),
        scale: 5 + random() * 5,
        phase: random() * Math.PI * 2,
        drift: 8 + random() * 12,
        alpha: dark ? 0.13 + random() * 0.1 : 0.09 + random() * 0.1,
      })),
    }
    if (!raf) raf = requestAnimationFrame(render)
  }

  function scheduleBirds() {
    clearTimeout(birdTimer)
    const wait = isDark() ? 36000 + Math.random() * 46000 : 18000 + Math.random() * 34000
    birdTimer = window.setTimeout(startBirds, wait)
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2)
    width = window.innerWidth
    height = window.innerHeight
    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(height * dpr)
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    buildScene()
    cancelAnimationFrame(raf)
    raf = requestAnimationFrame(render)
  }

  let resizeTimer = 0
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer)
    resizeTimer = window.setTimeout(resize, 140)
  })
  window.addEventListener('stacktao:theme', () => {
    cancelAnimationFrame(raf)
    render()
  })
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(raf)
    else if (!sceneSettled || birdEvent) raf = requestAnimationFrame(render)
  })
  reduced.addEventListener('change', resize)
  resize()
  scheduleBirds()
}
