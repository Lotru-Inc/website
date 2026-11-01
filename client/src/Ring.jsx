import { useEffect, useRef } from 'react'

// Ring palette, walked around the circle (conic gradient). Last stop repeats the first.
const STOPS = ['#ffb25c', '#ff7a59', '#f2618f', '#b77cf0', '#7d93ff', '#ffc77a', '#ffb25c']

const TAU = Math.PI * 2
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const easeOut = (x) => 1 - Math.pow(1 - x, 3)
const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)
// Shortest signed difference between two angles
const angleDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b))

/**
 * A softly breathing ring of light that turns toward whoever is nearby.
 *
 * - `slotRef`: layout element the ring is centred in (the DOM decides where it sits).
 * - `control`: mutable ref the page writes to, read every frame:
 *     { hover: bool, open: bool, knocks: number[] (performance.now() timestamps) }
 */
export default function Ring({ slotRef, control }) {
  const mainRef = useRef(null)
  const bloomRef = useRef(null)
  const hazeRef = useRef(null)

  useEffect(() => {
    const main = mainRef.current
    const bloom = bloomRef.current
    const haze = hazeRef.current
    const ctx = main.getContext('2d')
    const bctx = bloom.getContext('2d')
    const hctx = haze.getContext('2d')
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let w = 0, h = 0, dpr = 1
    let cx = 0, cy = 0, R = 100

    const pointer = { x: 0, y: 0, active: false, last: -Infinity }
    // Eased state
    const focus = { angle: -Math.PI / 2, amount: 0 }
    const shift = { x: 0, y: 0 }
    let hover = 0
    let opened = 0

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = window.innerWidth
      h = window.innerHeight
      main.width = Math.round(w * dpr)
      main.height = Math.round(h * dpr)
      // Bloom layers render at low resolution; CSS scaling + blur does the rest.
      bloom.width = Math.round(w / 4)
      bloom.height = Math.round(h / 4)
      haze.width = Math.round(w / 8)
      haze.height = Math.round(h / 8)
    }

    // Read the anchor every frame: cheap, and it survives font swaps and scrolling.
    const measure = () => {
      const rect = slotRef.current.getBoundingClientRect()
      cx = rect.left + rect.width / 2
      cy = rect.top + rect.height / 2
      R = rect.width * 0.36
    }

    const onMove = (e) => {
      pointer.x = e.clientX
      pointer.y = e.clientY
      pointer.active = true
      pointer.last = performance.now()
    }
    const onLeave = () => { pointer.active = false }

    const start = performance.now()
    let prev = start
    let raf = 0

    const frame = (now) => {
      const dt = Math.min((now - prev) / 1000, 0.05)
      prev = now
      measure()
      const t = reduceMotion ? 6 : (now - start) / 1000
      const ctl = control.current

      // Power-on: the ring opens out of a point of light.
      const wake = reduceMotion ? 1 : easeOut(clamp((t - 0.25) / 2.4, 0, 1))
      const breath = reduceMotion ? 0.5 : 0.5 + 0.5 * Math.sin((t / 7) * TAU - Math.PI / 2)

      // Hover brightens; "open" widens the ring to make room for what's inside.
      hover += ((ctl.hover ? 1 : 0) - hover) * (1 - Math.exp(-dt * 6))
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
      const idle = !pointer.active || now - pointer.last > 4000
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
      const k = 1 - Math.exp(-dt * (idle ? 1.2 : 4))
      focus.angle += angleDiff(targetAngle, focus.angle) * k
      focus.amount += (targetAmount - focus.amount) * k

      // Subtle parallax toward the pointer
      const sx = idle ? 0 : (pointer.x - w / 2) * 0.012
      const sy = idle ? 0 : (pointer.y - h / 2) * 0.012
      shift.x += (sx - shift.x) * k
      shift.y += (sy - shift.y) * k

      const ox = cx + shift.x
      const oy = cy + shift.y
      const r = R * (0.15 + 0.85 * wake) * grow * (1 - 0.045 * knock)
      const amt = Math.min(1.4, focus.amount + 0.35 * hover + 0.8 * knock) * wake

      // ---- build the ring outline ----
      const N = 220
      const outer = new Array(N)
      const inner = new Array(N)
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
        outer[i] = [ox + c * (mid + th / 2), oy + s * (mid + th / 2)]
        inner[i] = [ox + c * (mid - th / 2), oy + s * (mid - th / 2)]
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)

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
      ctx.moveTo(outer[0][0], outer[0][1])
      for (let i = 1; i < N; i++) ctx.lineTo(outer[i][0], outer[i][1])
      ctx.closePath()
      ctx.moveTo(inner[N - 1][0], inner[N - 1][1])
      for (let i = N - 2; i >= 0; i--) ctx.lineTo(inner[i][0], inner[i][1])
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
      ctx.fillRect(0, 0, w, h)
      ctx.restore()
      ctx.globalAlpha = 1

      // ---- bloom: downsampled copies, blurred by CSS ----
      bctx.globalCompositeOperation = 'source-over'
      bctx.clearRect(0, 0, bloom.width, bloom.height)
      bctx.globalCompositeOperation = 'lighter'
      bctx.globalAlpha = 0.7 + 0.3 * breath
      bctx.drawImage(main, 0, 0, bloom.width, bloom.height)
      bctx.drawImage(main, 0, 0, bloom.width, bloom.height)
      hctx.globalCompositeOperation = 'source-over'
      hctx.clearRect(0, 0, haze.width, haze.height)
      hctx.globalCompositeOperation = 'lighter'
      hctx.globalAlpha = (0.55 + 0.45 * breath) * wake
      for (let i = 0; i < 3; i++) hctx.drawImage(main, 0, 0, haze.width, haze.height)

      raf = requestAnimationFrame(frame)
    }

    resize()
    window.addEventListener('resize', resize)
    window.addEventListener('pointermove', onMove, { passive: true })
    window.addEventListener('pointerdown', onMove, { passive: true })
    document.documentElement.addEventListener('pointerleave', onLeave)
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerdown', onMove)
      document.documentElement.removeEventListener('pointerleave', onLeave)
    }
  }, [slotRef, control])

  return (
    <div className="ring" aria-hidden="true">
      <canvas ref={hazeRef} className="ring-haze" />
      <canvas ref={bloomRef} className="ring-bloom" />
      <canvas ref={mainRef} className="ring-main" />
    </div>
  )
}
