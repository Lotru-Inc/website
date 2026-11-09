// Small helpers shared by the brand page generators.
import { SITE, BASE } from './brand.data.js'

export const url = (file = '') => `${SITE}${BASE}${file ? `/${file}` : ''}`
export const path = (file = '') => `${BASE}${file ? `/${file}` : ''}`

export const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

export const hexRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))

export const rgbText = (hex) => hexRgb(hex).join(' ')

export function hslText(hex) {
  const [r, g, b] = hexRgb(hex).map((v) => v / 255)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  const l = (max + min) / 2
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1))
  let h = 0
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
  }
  return `${Math.round((h * 60 + 360) % 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
}

// Accepts #rrggbb or rgba(r, g, b, a) and flattens it over an opaque background.
function flatten(color, bg) {
  if (color.startsWith('#')) return hexRgb(color)
  const [r, g, b, a] = color.match(/[\d.]+/g).map(Number)
  const under = hexRgb(bg)
  return [r, g, b].map((v, i) => v * a + under[i] * (1 - a))
}

const luminance = (rgb) => {
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrast(color, bg) {
  const a = luminance(flatten(color, bg))
  const b = luminance(hexRgb(bg))
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

export const rating = (ratio) =>
  ratio >= 7 ? 'AAA' : ratio >= 4.5 ? 'AA' : ratio >= 3 ? 'AA large text only' : 'Decorative only'

// A compact view of how the semantic text colors and accent colors read on each background.
export function contrastTable({ semantic, accents }) {
  const get = (id, theme) => semantic.find((t) => t.id === id)[theme]
  const rows = []
  for (const theme of ['dark', 'light']) {
    const bg = get('bg', theme)
    const surface = get('surface', theme)
    for (const fg of ['text', 'text-soft', 'text-faint']) {
      rows.push({ theme, foreground: fg, background: 'bg', ratio: contrast(get(fg, theme), bg) })
    }
    rows.push({ theme, foreground: 'text-soft', background: 'surface', ratio: contrast(get('text-soft', theme), surface) })
    const lowest = accents
      .map((c) => ({ name: c.id, ratio: contrast(c[theme], bg) }))
      .sort((a, b) => a.ratio - b.ratio)[0]
    rows.push({ theme, foreground: `${lowest.name} (lowest accent)`, background: 'bg', ratio: lowest.ratio })
  }
  return rows.map((r) => ({ ...r, ratio: Math.round(r.ratio * 100) / 100, rating: rating(r.ratio) }))
}
