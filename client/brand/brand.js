// Progressive enhancement only. The page is complete without this file.
const KEY = 'lotru-brand-theme'
const root = document.documentElement
const toggle = document.querySelector('[data-theme-toggle]')
const themeMeta = document.querySelector('meta[name="theme-color"]')
const system = window.matchMedia('(prefers-color-scheme: light)')

const currentTheme = () => root.dataset.theme || (system.matches ? 'light' : 'dark')

function syncTheme() {
  const theme = currentTheme()
  const next = theme === 'dark' ? 'light' : 'dark'
  toggle.textContent = next === 'light' ? 'Light mode' : 'Dark mode'
  toggle.setAttribute('aria-label', `Switch to ${next} mode`)
  themeMeta.content = theme === 'dark' ? '#0a0908' : '#e8dfd0'
}

toggle.hidden = false
toggle.addEventListener('click', () => {
  const next = currentTheme() === 'dark' ? 'light' : 'dark'
  root.dataset.theme = next
  try {
    localStorage.setItem(KEY, next)
  } catch {
    // Private windows can block storage; the toggle still works for this visit.
  }
  syncTheme()
})
system.addEventListener('change', syncTheme)
syncTheme()

// Copy-to-clipboard
const status = document.querySelector('[data-copy-status]')

document.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-copy]')
  if (!button) return
  try {
    await navigator.clipboard.writeText(button.dataset.copy)
  } catch {
    status.textContent = 'Copy failed'
    return
  }
  status.textContent = 'Copied'
  button.classList.add('is-copied')
  setTimeout(() => button.classList.remove('is-copied'), 1200)
})

// Highlight the current section in the rail
const links = new Map(
  [...document.querySelectorAll('.rail a[href^="#"]')].map((a) => [a.getAttribute('href').slice(1), a]),
)
const observer = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue
      links.forEach((a) => a.removeAttribute('aria-current'))
      links.get(entry.target.id)?.setAttribute('aria-current', 'true')
    }
  },
  { rootMargin: '-20% 0px -70% 0px' },
)
document.querySelectorAll('.section').forEach((s) => observer.observe(s))
