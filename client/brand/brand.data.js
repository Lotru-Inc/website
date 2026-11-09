// The single source of truth for lotru.com/brand. The HTML page, brand.md, brand.json,
// tokens.css and llms.txt are all generated from this file. Edit values here only.

export const SITE = 'https://lotru.com'
export const BASE = '/brand'

export const meta = {
  name: 'Lotru',
  version: '0.1.0',
  updated: '2026-11-08',
  summary:
    'Logos, color, typography, ring motif, UI tokens and voice for Lotru.',
}

export const resources = [
  { id: 'html', file: '', format: 'HTML', title: 'Brand page', use: 'Visual reference for people. Static HTML; no JavaScript needed to read it.' },
  { id: 'markdown', file: 'brand.md', format: 'Markdown', title: 'Full spec', use: 'Best single fetch for agents. Everything on this page, as text.' },
  { id: 'json', file: 'brand.json', format: 'JSON', title: 'Structured data', use: 'Design tokens (DTCG format), logo and font URLs, rules.' },
  { id: 'css', file: 'tokens.css', format: 'CSS', title: 'CSS variables', use: 'Copy into a project for --lotru-* variables in both themes.' },
  { id: 'llms', file: 'llms.txt', format: 'llms.txt', title: 'Agent index', use: 'Short index of these resources.' },
]

// ---------------------------------------------------------------- color

export const neutrals = [
  { id: 'night', name: 'Night', hex: '#0a0908', use: 'Page background on dark. Text and logo letters on light.' },
  { id: 'coal', name: 'Coal', hex: '#161412', use: 'Raised surfaces on dark.' },
  { id: 'bone', name: 'Bone', hex: '#e8dfd0', use: 'Page background on light.' },
  { id: 'paper', name: 'Paper', hex: '#fbf8f4', use: 'Text and logo letters on dark. Raised surfaces on light.' },
]

// Accent colors for general use. `dark` is for dark backgrounds; `light` is deeper so
// the pale end doesn't wash out on light backgrounds. Must match brand/build_logo.py.
export const accents = [
  { id: 'amber', name: 'Amber', dark: '#ffb25c', light: '#f39a3e' },
  { id: 'coral', name: 'Coral', dark: '#ff7a59', light: '#f0663b' },
  { id: 'rose', name: 'Rose', dark: '#f2618f', light: '#db4585' },
  { id: 'violet', name: 'Violet', dark: '#b77cf0', light: '#9466ee' },
  { id: 'periwinkle', name: 'Periwinkle', dark: '#7d93ff', light: '#5f78f0' },
]

export const semantic = [
  { id: 'bg', dark: '#0a0908', light: '#e8dfd0', use: 'Page background.' },
  { id: 'surface', dark: '#161412', light: '#fbf8f4', use: 'Cards and raised panels.' },
  { id: 'text', dark: '#fbf8f4', light: '#0a0908', use: 'Primary text.' },
  { id: 'text-soft', dark: 'rgba(251, 248, 244, 0.62)', light: 'rgba(10, 9, 8, 0.68)', use: 'Secondary text. Safe for body copy.' },
  { id: 'text-faint', dark: 'rgba(251, 248, 244, 0.34)', light: 'rgba(10, 9, 8, 0.42)', use: 'Decorative labels only. Fails WCAG for reading text.' },
  { id: 'border', dark: 'rgba(251, 248, 244, 0.18)', light: 'rgba(10, 9, 8, 0.45)', use: 'Hairlines and control outlines.' },
]

// The ring's own palette, walked clockwise. It belongs to the logo and is separate from the
// accents. Must match brand/build_logo.py and STOPS in client/src/Ring.jsx.
const ringStops = {
  dark: ['#ffb25c', '#ff7a59', '#f2618f', '#b77cf0', '#7d93ff', '#ffc77a', '#ffb25c'],
  light: ['#f39a3e', '#f0663b', '#db4585', '#9466ee', '#5f78f0', '#f0a040', '#f39a3e'],
}
const conic = (key) => `conic-gradient(from 20deg, ${ringStops[key].join(', ')})`

export const gradients = [
  {
    id: 'ring',
    name: 'Ring',
    dark: conic('dark'),
    light: conic('light'),
    use: 'The ring of light. Conic, walked clockwise. Its colors belong to the logo; use the accent colors for everything else.',
  },
  {
    id: 'glow',
    name: 'Glow',
    dark: 'linear-gradient(92deg, #ffc285 0%, #ff8a5c 30%, #f2649a 62%, #a98bff 100%)',
    light: 'linear-gradient(92deg, #f39a3e 0%, #f0663b 30%, #db4585 62%, #9466ee 100%)',
    use: 'Clipped to display text, one phrase at a time. Display sizes only.',
  },
]

export const colorRules = [
  'Neutrals carry the page. Color comes from the accents and gradients, used sparingly.',
  'Use the dark-mode accent values on dark backgrounds and the light-mode values on light backgrounds.',
  'Dark is the default theme for Lotru surfaces.',
]

// ---------------------------------------------------------------- type

const fontTail = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'

export const fonts = [
  {
    id: 'text',
    family: 'Geist',
    role: 'Default text and UI',
    weights: '100-900 (variable)',
    stack: `"Geist Variable", Geist, ${fontTail}`,
    sample: 'Geist',
    license: 'SIL Open Font License 1.1',
    source: 'https://fonts.google.com/specimen/Geist',
    file: 'fonts/Geist-Variable.woff2',
    licenseFile: 'fonts/Geist-OFL.txt',
    notes: 'Use for all reading and interface text.',
  },
  {
    id: 'display',
    family: 'Fredoka',
    role: 'Display accent and wordmark',
    weights: '300-700 (variable)',
    stack: `"Fredoka Variable", Fredoka, "Geist Variable", ${fontTail}`,
    sample: 'Fredoka',
    license: 'SIL Open Font License 1.1',
    source: 'https://fonts.google.com/specimen/Fredoka',
    file: 'fonts/Fredoka-Variable.woff2',
    licenseFile: 'fonts/Fredoka-OFL.txt',
    notes: 'Weight 600. The rounded voice of the logo: one short phrase at a time, usually with the Glow gradient. Never body copy.',
  },
]

export const monoStack = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'

export const typeScale = [
  { id: 'display', font: 'text', weight: 620, size: 'clamp(2.2rem, 5.4vw, 4.5rem)', lineHeight: '1.04', tracking: '-0.04em', use: 'Page-level titles.', sample: 'Large page title' },
  { id: 'display-rounded', font: 'display', weight: 600, size: 'clamp(2.2rem, 5.4vw, 4.5rem)', lineHeight: '1.04', tracking: '-0.01em', use: 'The accent phrase in a display line.', sample: 'Accent phrase' },
  { id: 'heading', font: 'text', weight: 620, size: '2rem', lineHeight: '1.05', tracking: '-0.035em', use: 'Section headings.', sample: 'Section heading' },
  { id: 'subheading', font: 'text', weight: 600, size: '1.25rem', lineHeight: '1.25', tracking: '-0.02em', use: 'Subsections and card titles.', sample: 'Ring of light' },
  { id: 'body', font: 'text', weight: 400, size: '1rem', lineHeight: '1.6', tracking: '0', use: 'Reading text.', sample: 'Body copy is set in Geist at a comfortable measure.' },
  { id: 'small', font: 'text', weight: 400, size: '0.875rem', lineHeight: '1.5', tracking: '0', use: 'Supporting text and table cells.', sample: 'Supporting detail and table cells.' },
  { id: 'control', font: 'text', weight: 500, size: '1rem', lineHeight: '1.2', tracking: '0.01em', use: 'Buttons and links styled as controls.', sample: 'Get in touch' },
  { id: 'eyebrow', font: 'text', weight: 500, size: '0.78rem', lineHeight: '1.2', tracking: '0.28em', transform: 'uppercase', use: 'Short uppercase labels.', sample: 'Label' },
  { id: 'caption', font: 'text', weight: 400, size: '0.72rem', lineHeight: '1.4', tracking: '0.04em', use: 'Legal lines and fine print.', sample: '© Lotru' },
]

// ---------------------------------------------------------------- logos

const logoFiles = (slug, big, small) => [
  { format: 'SVG', file: `logos/${slug}.svg` },
  { format: 'PNG', file: `logos/${slug}.png`, width: big[0], height: big[1] },
  ...(small ? [{ format: 'PNG', file: `logos/${slug}-small.png`, width: small[0], height: small[1] }] : []),
]

export const logos = [
  {
    id: 'logo-on-dark',
    title: 'Wordmark, on dark',
    kind: 'wordmark',
    background: 'dark',
    use: 'Default logo. Paper letters on Night or any dark surface.',
    files: logoFiles('lotru-logo-on-dark', [2252, 810], [768, 276]),
  },
  {
    id: 'logo-on-light',
    title: 'Wordmark, on light',
    kind: 'wordmark',
    background: 'light',
    use: 'Night letters and the deeper ring on Bone, Paper or white.',
    files: logoFiles('lotru-logo-on-light', [2252, 810], [768, 276]),
  },
  {
    id: 'mark-on-dark',
    title: 'Ring mark, on dark',
    kind: 'mark',
    background: 'dark',
    use: 'App icons, avatars and small spaces, on dark.',
    files: logoFiles('lotru-mark-on-dark', [1024, 1024]),
  },
  {
    id: 'mark-on-light',
    title: 'Ring mark, on light',
    kind: 'mark',
    background: 'light',
    use: 'App icons, avatars and small spaces, on light.',
    files: logoFiles('lotru-mark-on-light', [1024, 1024]),
  },
]

export const logoRules = {
  clearspace: 'Keep clear space of one ring radius (half the width of the "o") on every side of the wordmark. For the ring mark, keep half its diameter.',
  minimumSize: [
    { asset: 'Wordmark', digital: '64 px wide', print: '16 mm wide' },
    { asset: 'Ring mark', digital: '16 px wide', print: '5 mm wide' },
  ],
  selection: [
    'Use the on-dark files on dark backgrounds and the on-light files on light backgrounds.',
    'Prefer SVG. Use PNG only where SVG is not supported.',
    'Use the wordmark first. Use the ring mark when the name is already nearby or space is tight.',
    'The wordmark is always lowercase and the "o" is always the ring.',
  ],
  misuse: [
    { id: 'rotate', text: 'Do not rotate the logo.' },
    { id: 'stretch', text: 'Do not stretch or squash the logo.' },
    { id: 'recolor', text: 'Do not recolor the ring.' },
    { id: 'effects', text: 'Do not add shadows, outlines or glows.' },
    { id: 'contrast', text: 'Do not use the on-light logo on a dark background, or the reverse.' },
    { id: 'retype', text: 'Do not retype the wordmark or replace the ring with a letter.' },
  ],
}

// ---------------------------------------------------------------- ring

export const ringRules = {
  statement: 'The ring of light is the core of the brand: a softly breathing circle that notices whoever is nearby. It is the "o" in the wordmark, the favicon, and the centerpiece of the site.',
  construction: [
    'Ring outer diameter equals the x-height of the Fredoka letters plus 4% overshoot, like a real round letter.',
    "Ring stroke equals the mean stroke width of Fredoka's own lowercase o.",
    'The ring is centered vertically on the x-height.',
    'Letters are knocked out around the ring with a gap of 0.45 times the ring stroke.',
    'The ring gradient starts rotated 20 degrees clockwise and walks clockwise.',
  ],
  behavior: [
    { property: 'Breath cycle', value: '7 s', note: 'Slow sine pulse in thickness and bloom.' },
    { property: 'Gradient drift', value: '0.06 rad/s', note: 'The conic gradient turns slowly.' },
    { property: 'Attention', value: 'Follows pointer', note: 'Thickens and brightens toward the pointer.' },
    { property: 'Knock', value: '2 pulses, 190 ms apart', note: 'A dip and rebound with an outward ripple.' },
    { property: 'Reduced motion', value: 'Static', note: 'Honor prefers-reduced-motion: no breathing, drift or ripples.' },
  ],
}

// ---------------------------------------------------------------- ui tokens

export const radii = [
  { id: 'sm', value: '8px', use: 'Inputs and small controls.' },
  { id: 'md', value: '14px', use: 'Cards and panels.' },
  { id: 'lg', value: '24px', use: 'Large feature panels.' },
  { id: 'pill', value: '999px', use: 'Buttons and chips.' },
]

export const spacing = [
  { id: '1', value: '4px' },
  { id: '2', value: '8px' },
  { id: '3', value: '12px' },
  { id: '4', value: '16px' },
  { id: '6', value: '24px' },
  { id: '8', value: '32px' },
  { id: '12', value: '48px' },
  { id: '16', value: '64px' },
  { id: '24', value: '96px' },
]

export const motion = {
  ease: { value: 'cubic-bezier(0.22, 1, 0.36, 1)', bezier: [0.22, 1, 0.36, 1], use: 'The default easing for everything.' },
  durations: [
    { id: 'fast', value: '300ms', use: 'Hover and focus.' },
    { id: 'base', value: '400ms', use: 'Small state changes.' },
    { id: 'slow', value: '900ms', use: 'Panels opening.' },
    { id: 'entrance', value: '1600ms', use: 'Page-load reveals: rise 14 px and unblur 6 px.' },
  ],
}

export const texture = {
  grain: 'Fractal-noise film grain over the page at 12% opacity with mix-blend-mode overlay. It keeps dark gradients from banding and adds warmth. Dark theme only.',
}

export const uiRules = [
  'Build from --lotru-* variables. Do not hard-code near-matches.',
  'Controls are pill-shaped with a hairline border and a faint fill, not solid color blocks.',
  'Motion should feel unhurried. Honor prefers-reduced-motion everywhere.',
  'Keep interfaces quiet: one glow moment per view.',
]

// ---------------------------------------------------------------- voice

export const voice = {
  name: [
    'In text, write Lotru with a capital L.',
    'Lowercase "lotru" exists only as the logo artwork.',
    'Never write LOTRU, LoTru or Lotru Inc. in copy.',
  ],
  titles: [
    'Keep titles short and concrete. Say what the thing is.',
    'Use sentence case for page and section titles.',
    'At display sizes, one short phrase can take Fredoka and the Glow gradient. Everything else stays in Geist.',
    'Use at most one glow phrase per view.',
  ],
  titleExample: { lead: 'A short, clear title', accent: 'with one accent phrase' },
  tone: [
    { trait: 'Calm', means: 'Quiet confidence. Short sentences. No exclamation-mark energy.' },
    { trait: 'Plain', means: 'Everyday words. No jargon.' },
    { trait: 'Warm', means: 'Talks to a person, not to a market segment.' },
    { trait: 'Respectful', means: 'Never talk down, sell fear or overpromise.' },
  ],
  examples: {
    do: ['Questions? Get in touch.', 'Saved. You can change this any time.'],
    dont: ['Unlock next-generation synergy!', 'Oops!! Something went super wrong!!'],
  },
}

export const contactPath = '/hello'
