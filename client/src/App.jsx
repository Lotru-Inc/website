import { useCallback, useEffect, useRef, useState } from 'react'
import Logo from './Logo'
import Ring from './Ring'

const HELLO_PATH = '/hello'
// Assembled at runtime so the address never appears verbatim in the HTML.
const EMAIL = ['hello', 'lotru.com'].join('@')
const MAILTO = `mailto:${EMAIL}?subject=${encodeURIComponent("Let's chat")}`

const isHelloPath = () => window.location.pathname.replace(/\/+$/, '') === HELLO_PATH

// Slow back-and-forth drift of the "Finally Smart." gradient: 12s each way, eased,
// starting once the line has risen in. Runs on the ring's clock (see Ring `onFrame`).
const SHIMMER_DELAY = 2.1
const SHIMMER_HALF_PERIOD = 12

export default function App() {
  const slotRef = useRef(null)
  const knockRef = useRef(null)
  const emailRef = useRef(null)
  const glowRef = useRef(null)
  const control = useRef({ hover: false, open: false, knocks: [] })
  const timers = useRef([])
  const returnFocus = useRef(false)
  const [open, setOpen] = useState(false)
  const year = new Date().getFullYear()

  const show = useCallback((value, { updateUrl = true } = {}) => {
    control.current.open = value
    if (value) control.current.hover = false
    setOpen(value)
    if (updateUrl && isHelloPath() !== value) {
      window.history.pushState(null, '', value ? HELLO_PATH : '/')
    }
  }, [])

  // Knock knock: two pulses, then the ring opens.
  const knock = useCallback(() => {
    if (control.current.open) return
    const now = performance.now()
    control.current.knocks = [now, now + 190]
    timers.current.push(setTimeout(() => show(true), 520))
  }, [show])

  const shimmer = useCallback((t) => {
    const el = glowRef.current
    if (!el || t < SHIMMER_DELAY) return
    const pos = 50 - 50 * Math.cos((Math.PI * (t - SHIMMER_DELAY)) / SHIMMER_HALF_PERIOD)
    el.style.backgroundPosition = `${pos.toFixed(2)}% 50%`
  }, [])

  const close = useCallback(() => {
    if (!control.current.open) return
    returnFocus.current = true
    show(false)
  }, [show])

  // Deep link: /hello knocks on its own once the ring has woken up.
  useEffect(() => {
    if (isHelloPath()) timers.current.push(setTimeout(knock, 1600))
    const onPop = () => {
      if (isHelloPath()) knock()
      else show(false, { updateUrl: false })
    }
    const onKey = (e) => { if (e.key === 'Escape') close() }
    window.addEventListener('popstate', onPop)
    window.addEventListener('keydown', onKey)
    const pending = timers.current
    return () => {
      pending.forEach(clearTimeout)
      window.removeEventListener('popstate', onPop)
      window.removeEventListener('keydown', onKey)
    }
  }, [knock, close, show])

  // Move focus into the card when it opens, and back to the ring when it closes.
  useEffect(() => {
    if (open) {
      emailRef.current?.focus({ preventScroll: true })
    } else if (returnFocus.current) {
      returnFocus.current = false
      knockRef.current?.focus({ preventScroll: true })
    }
  }, [open])

  return (
    <div className={open ? 'site is-open' : 'site'}>
      <Ring slotRef={slotRef} control={control} onFrame={shimmer} />
      {open && <div className="scrim" onClick={close} aria-hidden="true" />}

      <main className="stage">
        <h1 className="wordmark">
          <Logo className="wordmark-logo" />
        </h1>

        <div className="ring-slot" ref={slotRef}>
          <button
            ref={knockRef}
            type="button"
            className="knock"
            aria-label="Knock"
            tabIndex={open ? -1 : 0}
            onClick={knock}
            onPointerEnter={() => { control.current.hover = true }}
            onPointerLeave={() => { control.current.hover = false }}
          />

          <section
            className="hello"
            role="dialog"
            aria-modal="true"
            aria-labelledby="hello-title"
            aria-hidden={!open}
          >
            <h2 id="hello-title" className="hello-title">
              <span>Interested?</span>
              <span className="hello-glow">Let’s chat!</span>
            </h2>
            <a ref={emailRef} className="hello-email" href={MAILTO} tabIndex={open ? 0 : -1}>
              {EMAIL}
            </a>
            <button type="button" className="hello-close" onClick={close} tabIndex={open ? 0 : -1}>
              Close
            </button>
          </section>
        </div>

        <div className="message" aria-hidden={open}>
          <p className="tagline">
            <span className="tagline-lead">Your Home. Your Data.</span>{' '}
            <span ref={glowRef} className="tagline-glow">Finally Smart.</span>
          </p>
          <p className="soon">Coming soon</p>
        </div>
      </main>

      <footer className="foot">© {year} Lotru</footer>
    </div>
  )
}
