import { useEffect, useRef } from 'react'

// Ring palette, walked around the circle (conic gradient). Last stop repeats the first.
const STOPS = ['#ffb25c', '#ff7a59', '#f2618f', '#b77cf0', '#7d93ff', '#ffc77a', '#ffb25c']

// Glow layers: low-resolution copies of the ring, blurred and screened over it.
// `scale` is CSS px per canvas px; `blur` is the gaussian sigma in CSS px.
const BLOOM = { scale: 4, blur: 14, saturate: 1.3, copies: 2, opacity: 1 }
const HAZE = { scale: 8, blur: 64, saturate: 1.4, copies: 3, opacity: 0.8 }

// Film grain keeps the dark glow from banding and adds warmth. It is only visible
// over the glow, so it is laid over the ring's canvas instead of the whole page.
const GRAIN_TILE = 160 // CSS px
const GRAIN_OPACITY = 0.12
const GRAIN_SVG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"

// Frame budget. Interaction gets smooth motion; the ambient drift doesn't need it.
const FAST_MS = 1000 / 60
const SLOW_MS = 1000 / 30

const TAU = Math.PI * 2
const N = 220
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const easeOut = (x) => 1 - Math.pow(1 - x, 3)
const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)
// Shortest signed difference between two angles
const angleDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b))

const canvas = () => document.createElement('canvas')

// ctx.filter exists in Chrome and Firefox; older Safari lacks it (or ignores it).
// Check that a blur actually spreads a pixel rather than trusting the property.
function supportsCanvasFilter() {
  try {
    const c = canvas()
    c.width = c.height = 5
    const x = c.getContext('2d', { willReadFrequently: true })
    if (typeof x.filter !== 'string') return false
    x.filter = 'blur(1px)'
    x.fillStyle = '#fff'
    x.fillRect(2, 2, 1, 1)
    return x.getImageData(0, 2, 1, 1).data[3] > 0
  } catch {
    return false
  }
}

/**
 * A softly breathing ring of light that turns toward whoever is nearby.
 *
 * - `slotRef`: layout element the ring is centred in (the DOM decides where it sits).
 * - `control`: mutable ref the page writes to, read every frame:
 *     { hover: bool, open: bool, knocks: number[] (performance.now() timestamps) }
 * - `onFrame(t)`: optional; called after each drawn frame with the ring's clock in
 *   seconds, so other ambient motion can share its frame budget. Not called when
 *   the user prefers reduced motion.
 *
 * Rendering is kept cheap on purpose, since the page sits open in tabs:
 * - Everything (haze, bloom, ring, grain) is composited inside a single canvas that
 *   only covers the ring's neighbourhood, and the page screens just that one canvas.
 *   No full-viewport layers, blend modes or CSS filters to redo every frame.
 * - The glow is blurred at 1/4 and 1/8 resolution.
 * - The loop draws at 60fps while something is happening, 30fps for the idle drift,
 *   and (with reduced motion) only when something changes.
 */
export default function Ring({ slotRef, control, onFrame }) {
  const canvasRef = useRef(null)
  const onFrameRef = useRef(onFrame)
  onFrameRef.current = onFrame

  useEffect(() => {
    const out = canvasRef.current
    // Opaque, on black: the page screens it on (see .ring in index.css), and black
    // screens to nothing. Painting the page colour here instead would show as a box
    // on colour-managed displays, which convert CSS colours but not canvas pixels.
    const octx = out.getContext('2d', { alpha: false })
    // The sharp ring, drawn off-screen first: the glow layers are made from it.
    const main = canvas()
    const ctx = main.getContext('2d')
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const canvasFilter = supportsCanvasFilter()

    const glows = [BLOOM, HAZE].map((g) => {
      const src = canvas() // the copies of the ring, summed
      const dst = canvas() // ...then blurred
      return {
        ...g,
        src,
        sctx: src.getContext('2d'),
        dst,
        dctx: dst.getContext('2d'),
        tmp: canvasFilter ? null : canvas(), // fallback blur's intermediate pass
        px: 0,
        size: 0,
      }
    })

    const grain = { img: new Image(), pattern: null }

    let dpr = 1
    let slotW = -1
    let R = 100
    let S = 0 // sharp ring area, CSS px square
    let size = 0 // output canvas (ring + glow), CSS px square
    let cx = 0, cy = 0
    let boxX = NaN, boxY = NaN
    let lastDraw = -Infinity

    const pointer = { x: 0, y: 0, active: false, last: -Infinity }
    // Eased state
    const focus = { angle: -Math.PI / 2, amount: 0 }
    const shift = { x: 0, y: 0 }
    let hover = 0
    let opened = 0

    const outer = new Float32Array(N * 2)
    const inner = new Float32Array(N * 2)

    const makeGrain = () => {
      if (!grain.img.complete || !grain.img.naturalWidth) return
      // Rasterise the noise at device resolution, like a CSS background would.
      const tile = canvas()
      tile.width = tile.height = Math.round(GRAIN_TILE * dpr)
      tile.getContext('2d').drawImage(grain.img, 0, 0, tile.width, tile.height)
      grain.pattern = octx.createPattern(tile, 'repeat')
      // One tile spans GRAIN_TILE CSS px (the context is already scaled by dpr).
      grain.pattern.setTransform(new DOMMatrix().scale(GRAIN_TILE / tile.width))
      lastDraw = -Infinity
    }
    grain.img.onload = makeGrain
    grain.img.src = GRAIN_SVG

    // Size everything to fit what the ring can draw: knock ripples (up to 1.75x the
    // radius, which itself grows 1.32x if the card opens mid-ripple: 0.36 * 1.32 * 1.75
    // = 0.83 of the slot, plus stroke) and pointer parallax, plus 3 sigma of haze around it
    // so the blur fades out before the canvas edge.
    const layout = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      R = slotW * 0.36
      const parallax = 0.006 * Math.max(window.innerWidth, window.innerHeight)
      S = Math.ceil(slotW * 0.84 + parallax + 8) * 2
      main.width = main.height = Math.round(S * dpr)
      for (const g of glows) {
        g.px = Math.ceil((S + 6 * g.blur) / g.scale)
        g.size = g.px * g.scale
        g.src.width = g.src.height = g.dst.width = g.dst.height = g.px
        if (g.tmp) g.tmp.width = g.tmp.height = g.px
      }
      // The haze is the widest layer; both it and S are even, so the sharp ring
      // lands on whole device pixels inside the output.
      size = Math.max(...glows.map((g) => g.size))
      out.width = out.height = Math.round(size * dpr)
      out.style.width = out.style.height = `${size}px`
      makeGrain()
      boxX = boxY = NaN // force a reposition
      lastDraw = -Infinity // resizing cleared the canvases
    }

    // Read the anchor every tick: cheap, and it survives font swaps and scrolling.
    // Only touch the DOM when the ring has actually moved.
    const measure = () => {
      const rect = slotRef.current.getBoundingClientRect()
      if (rect.width !== slotW) {
        slotW = rect.width
        layout()
      }
      cx = rect.left + rect.width / 2
      cy = rect.top + rect.height / 2
      // Snap to device pixels so the ring never sits between pixels.
      const x = Math.round((cx - size / 2) * dpr) / dpr
      const y = Math.round((cy - size / 2) * dpr) / dpr
      if (x === boxX && y === boxY) return
      boxX = x
      boxY = y
      out.style.transform = `translate(${x}px, ${y}px)`
    }

    // Blur `g.src` into `g.dst`.
    const blur = (g) => {
      const { dctx, dst } = g
      dctx.clearRect(0, 0, dst.width, dst.height)
      if (canvasFilter) {
        dctx.filter = `blur(${g.blur / g.scale}px) saturate(${g.saturate})`
        dctx.drawImage(g.src, 0, 0)
        dctx.filter = 'none'
        return
      }
      // Fallback: two passes of offset copies, each spread like a gaussian with
      // sigma / sqrt(2), so together they make one with the full sigma.
      const sigma = g.blur / g.scale / Math.SQRT2
      const tctx = g.tmp.getContext('2d')
      tctx.clearRect(0, 0, g.px, g.px)
      spread(tctx, g.src, sigma, 0)
      spread(dctx, g.tmp, sigma, 1.3)
    }

    // Add TAPS copies of `img`, offset along a spiral whose radii follow a 2D gaussian.
    const TAPS = 20
    const spread = (x, img, sigma, turn) => {
      x.globalCompositeOperation = 'lighter'
      x.globalAlpha = 1 / TAPS
      for (let i = 0; i < TAPS; i++) {
        const rho = sigma * Math.sqrt(-2 * Math.log(1 - (i + 0.5) / TAPS))
        const a = turn + i * 2.39996 // golden angle
        x.drawImage(img, rho * Math.cos(a), rho * Math.sin(a))
      }
      x.globalCompositeOperation = 'source-over'
      x.globalAlpha = 1
    }

    const onResize = () => {
      slotW = -1 // re-layout on the next tick (also picks up devicePixelRatio changes)
    }
    const onMove = (e) => {
      pointer.x = e.clientX
      pointer.y = e.clientY
      pointer.active = true
      pointer.last = performance.now()
    }
    const onLeave = () => { pointer.active = false }

    const start = performance.now()
    let fast = true
    let seen = { hover: null, open: null, knocks: null, idle: null }
    let raf = 0

    const frame = (now) => {
      raf = requestAnimationFrame(frame)
      measure()
      const ctl = control.current

      // Skip this vsync if nothing needs a frame yet. Anything the page or the
      // pointer just did counts as urgent.
      // Going idle (pointer left, or 4s without movement) counts too: with reduced
      // motion nothing else would wake the ring to turn back to its resting pose.
      const idle = !pointer.active || now - pointer.last > 4000
      const urgent = now - pointer.last < 250 || idle !== seen.idle ||
        ctl.hover !== seen.hover || ctl.open !== seen.open || ctl.knocks !== seen.knocks
      const budget = fast || urgent ? FAST_MS : reduceMotion ? Infinity : SLOW_MS
      if (now - lastDraw < budget - 2) return
      seen = { hover: ctl.hover, open: ctl.open, knocks: ctl.knocks, idle }

      const dt = Math.min((now - lastDraw) / 1000, 0.05)
      lastDraw = now
      const t = reduceMotion ? 6 : (now - start) / 1000
      const w = window.innerWidth
      const h = window.innerHeight

      // Power-on: the ring opens out of a point of light.
      const wake = reduceMotion ? 1 : easeOut(clamp((t - 0.25) / 2.4, 0, 1))
      const breath = reduceMotion ? 0.5 : 0.5 + 0.5 * Math.sin((t / 7) * TAU - Math.PI / 2)

      // Hover brightens; "open" widens the ring to make room for what's inside.
      const hoverTarget = ctl.hover ? 1 : 0
      hover += (hoverTarget - hover) * (1 - Math.exp(-dt * 6))
      const openTarget = ctl.open ? 1 : 0
      opened = reduceMotion ? openTarget : opened + (openTarget - opened) * (1 - Math.exp(-dt * 3.2))
      const grow = 1 + 0.32 * easeInOut(clamp(opened, 0, 1))

      // Knocks: a quick dip-and-rebound per knock, plus an outward ripple.
      let knock = 0
      const ripples = []
      if (!reduceMotion) {
        for (const kt of ctl.knocks) {
          const s = (now - kt) / 1000
          if (s < 0 || s > 1.8) continue
          knock += Math.exp(-s * 11)
          ripples.push(s / 1.8)
        }
      }

      // Where should the ring's attention be?
      let targetAngle, targetAmount
      if (idle) {
        targetAngle = -Math.PI / 2 + t * 0.12
        targetAmount = 0.3
      } else {
        const dx = pointer.x - cx
        const dy = pointer.y - cy
        const dist = Math.hypot(dx, dy)
        targetAngle = Math.atan2(dy, dx)
        // Closer = more attentive. Inside the ring counts as fully attentive.
        targetAmount = clamp(1 - (dist - R) / (Math.max(w, h) * 0.55), 0.35, 1)
      }
      // With reduced motion the resting pose is held still rather than drifted into.
      const k = reduceMotion && idle ? 1 : 1 - Math.exp(-dt * (idle ? 1.2 : 4))
      focus.angle += angleDiff(targetAngle, focus.angle) * k
      focus.amount += (targetAmount - focus.amount) * k

      // Subtle parallax toward the pointer
      const sx = idle ? 0 : (pointer.x - w / 2) * 0.012
      const sy = idle ? 0 : (pointer.y - h / 2) * 0.012
      shift.x += (sx - shift.x) * k
      shift.y += (sy - shift.y) * k

      // Ring centre, in the sharp canvas's CSS px
      const m = (size - S) / 2 // where the sharp canvas sits inside the output
      const ox = cx - boxX - m + shift.x
      const oy = cy - boxY - m + shift.y
      const r = R * (0.15 + 0.85 * wake) * grow * (1 - 0.045 * knock)
      const amt = Math.min(1.4, focus.amount + 0.35 * hover + 0.8 * knock) * wake

      // ---- build the ring outline ----
      for (let i = 0; i < N; i++) {
        const a = (i / N) * TAU
        const d = angleDiff(a, focus.angle)
        const f = Math.exp(-(d * d) / (2 * 0.6 * 0.6)) * amt
        const wobble = reduceMotion ? 0 :
          R * (0.006 * Math.sin(3 * a + 0.55 * t) +
               0.004 * Math.sin(5 * a - 0.8 * t) +
               0.003 * Math.sin(2 * a + 0.31 * t))
        const mid = r + wobble * wake + f * R * 0.025
        const th = R * (0.028 + 0.012 * breath + 0.055 * f + 0.012 * hover + 0.03 * knock) *
          (0.4 + 0.6 * wake)
        const c = Math.cos(a), s = Math.sin(a)
        outer[2 * i] = ox + c * (mid + th / 2)
        outer[2 * i + 1] = oy + s * (mid + th / 2)
        inner[2 * i] = ox + c * (mid - th / 2)
        inner[2 * i + 1] = oy + s * (mid - th / 2)
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, S, S)

      const grad = ctx.createConicGradient(t * 0.06 - Math.PI / 2, ox, oy)
      STOPS.forEach((c, i) => grad.addColorStop(i / (STOPS.length - 1), c))

      // Ripples travel outward from the ring after each knock.
      for (const p of ripples) {
        ctx.globalAlpha = 0.45 * Math.pow(1 - p, 2) * wake
        ctx.strokeStyle = grad
        ctx.lineWidth = Math.max(1, R * 0.018 * (1 - p))
        ctx.beginPath()
        ctx.arc(ox, oy, r * (1 + 0.75 * easeOut(p)), 0, TAU)
        ctx.stroke()
      }

      ctx.beginPath()
      ctx.moveTo(outer[0], outer[1])
      for (let i = 1; i < N; i++) ctx.lineTo(outer[2 * i], outer[2 * i + 1])
      ctx.closePath()
      ctx.moveTo(inner[2 * (N - 1)], inner[2 * (N - 1) + 1])
      for (let i = N - 2; i >= 0; i--) ctx.lineTo(inner[2 * i], inner[2 * i + 1])
      ctx.closePath()

      ctx.globalAlpha = 0.25 + 0.75 * wake
      ctx.fillStyle = grad
      ctx.fill('evenodd')

      // Hot spot where the ring is "looking"
      ctx.save()
      ctx.clip('evenodd')
      ctx.globalCompositeOperation = 'lighter'
      const hx = ox + Math.cos(focus.angle) * r
      const hy = oy + Math.sin(focus.angle) * r
      const hot = ctx.createRadialGradient(hx, hy, 0, hx, hy, R * 1.1)
      hot.addColorStop(0, `rgba(255, 244, 228, ${Math.min(1, 0.75 * amt)})`)
      hot.addColorStop(1, 'rgba(255, 244, 228, 0)')
      ctx.fillStyle = hot
      ctx.fillRect(hx - R * 1.1, hy - R * 1.1, R * 2.2, R * 2.2) // the gradient's extent
      ctx.restore()
      ctx.globalAlpha = 1

      // ---- glow: downsampled copies of the ring, blurred ----
      const alphas = [0.7 + 0.3 * breath, (0.55 + 0.45 * breath) * wake]
      glows.forEach((g, gi) => {
        const { sctx, src } = g
        const n = S / g.scale
        const at = (g.px - n) / 2
        sctx.globalCompositeOperation = 'source-over'
        sctx.clearRect(0, 0, src.width, src.height)
        sctx.globalCompositeOperation = 'lighter'
        sctx.globalAlpha = alphas[gi]
        for (let i = 0; i < g.copies; i++) sctx.drawImage(main, at, at, n, n)
        blur(g)
      })

      // ---- composite: glow layers screened together on black, then the grain.
      // The same stack (and blend modes) the page used to build in CSS. ----
      octx.setTransform(dpr, 0, 0, dpr, 0, 0)
      octx.globalCompositeOperation = 'source-over'
      octx.globalAlpha = 1
      octx.clearRect(0, 0, size, size) // opaque canvas: clears to black
      octx.globalCompositeOperation = 'screen'
      for (const g of [glows[1], glows[0]]) {
        octx.globalAlpha = g.opacity
        const o = (size - g.size) / 2
        octx.drawImage(g.dst, o, o, g.size, g.size)
      }
      octx.globalAlpha = 1
      octx.drawImage(main, m, m, S, S)
      if (grain.pattern) {
        octx.globalCompositeOperation = 'overlay'
        octx.globalAlpha = GRAIN_OPACITY
        octx.fillStyle = grain.pattern
        octx.fillRect(0, 0, size, size)
      }

      // Keep drawing at full rate until every eased value has settled. The idle
      // drift (slow rotation, breathing) is fine at the lower rate.
      const settling = Math.abs(angleDiff(targetAngle, focus.angle)) > 0.002 ||
        Math.abs(targetAmount - focus.amount) > 0.002 ||
        Math.abs(sx - shift.x) + Math.abs(sy - shift.y) > 0.05
      fast = (!reduceMotion && wake < 1) ||
        ripples.length > 0 ||
        Math.abs(openTarget - opened) > 0.002 ||
        Math.abs(hoverTarget - hover) > 0.002 ||
        (settling && (!idle || reduceMotion))

      if (!reduceMotion) onFrameRef.current?.(t)
    }

    window.addEventListener('resize', onResize)
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerdown', onMove, { passive: true })
    document.documentElement.addEventListener('pointerleave', onLeave)
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      grain.img.onload = null
      window.removeEventListener('resize', onResize)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onMove)
      document.documentElement.removeEventListener('pointerleave', onLeave)
    }
  }, [slotRef, control])

  return (
    <canvas ref={canvasRef} className="ring" aria-hidden="true" />
  )
}
