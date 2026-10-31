import { useRef } from 'react'
import Ring from './Ring'

export default function App() {
  const slotRef = useRef(null)
  const year = new Date().getFullYear()

  return (
    <>
      <Ring slotRef={slotRef} />
      <div className="grain" aria-hidden="true" />

      <main className="stage">
        <h1 className="wordmark">lotru</h1>

        <div className="ring-slot" ref={slotRef} />

        <div className="message">
          <p className="tagline">
            <span className="tagline-lead">Your Home. Your Data.</span>{' '}
            <span className="tagline-glow">Finally Smart.</span>
          </p>
        </div>
      </main>

      <footer className="foot">© {year} Lotru</footer>
    </>
  )
}
