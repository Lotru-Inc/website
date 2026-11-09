// Generates the machine-readable files: tokens.css, brand.json, brand.md and llms.txt.
import * as b from './brand.data.js'
import { url, contrastTable, rgbText, hslText } from './lib.js'

const font = (id) => b.fonts.find((f) => f.id === id)

// ---------------------------------------------------------------- tokens.css

const themeVars = (theme) =>
  [
    ...b.semantic.map((t) => `--lotru-${t.id}: ${t[theme]};`),
    ...b.accents.map((c) => `--lotru-${c.id}: ${c[theme]};`),
    ...b.gradients.map((g) => `--lotru-gradient-${g.id}: ${g[theme]};`),
    `color-scheme: ${theme};`,
  ]
    .map((line) => `  ${line}`)
    .join('\n')

const staticVars = () =>
  [
    ...b.neutrals.map((c) => `--lotru-${c.id}: ${c.hex};`),
    ...b.fonts.map((f) => `--lotru-font-${f.id}: ${f.stack};`),
    `--lotru-font-mono: ${b.monoStack};`,
    ...b.radii.map((r) => `--lotru-radius-${r.id}: ${r.value};`),
    ...b.spacing.map((s) => `--lotru-space-${s.id}: ${s.value};`),
    `--lotru-ease: ${b.motion.ease.value};`,
    ...b.motion.durations.map((d) => `--lotru-duration-${d.id}: ${d.value};`),
  ]
    .map((line) => `  ${line}`)
    .join('\n')

export function tokensCss() {
  return `/* Lotru design tokens v${b.meta.version}. ${url('tokens.css')}
   Dark is the default. Light applies from the system preference, or with data-theme="light" on <html>.
   Set data-theme="dark" to force dark. */

:root {
${staticVars()}
}

:root {
${themeVars('dark')}
}

@media (prefers-color-scheme: light) {
  :root:not([data-theme='dark']) {
${themeVars('light').replace(/^/gm, '  ')}
  }
}

:root[data-theme='light'] {
${themeVars('light')}
}
`
}

// ---------------------------------------------------------------- brand.json

const tok = (type, value, description) => ({
  $type: type,
  $value: value,
  ...(description ? { $description: description } : {}),
})

const group = (list, fn) => Object.fromEntries(list.map((item) => [item.id, fn(item)]))

const stopsOf = (css) => {
  const matches = [...css.matchAll(/(#[0-9a-f]{6})(?:\s+(\d+)%)?/gi)]
  return matches.map((m, i) => ({
    color: m[1],
    position: m[2] !== undefined ? Number(m[2]) / 100 : Math.round((i / (matches.length - 1)) * 1000) / 1000,
  }))
}

const themeTokens = (theme) => ({
  ...group(b.semantic, (t) => tok('color', t[theme], t.use)),
  accent: group(b.accents, (c) => tok('color', c[theme])),
  gradient: group(b.gradients, (g) => ({
    ...tok('gradient', stopsOf(g[theme]), g.use),
    $extensions: { 'com.lotru.css': g[theme] },
  })),
})

const files = (list) =>
  list.map(({ file, ...rest }) => ({ ...rest, url: url(file) }))

export function brandJson() {
  const data = {
    name: b.meta.name,
    version: b.meta.version,
    updated: b.meta.updated,
    summary: b.meta.summary,
    resources: Object.fromEntries(b.resources.map((r) => [r.id, url(r.file)])),
    logos: b.logos.map(({ files: list, ...rest }) => ({ ...rest, files: files(list) })),
    logoRules: b.logoRules,
    fonts: b.fonts.map(({ file, licenseFile, sample, ...rest }) => ({
      ...rest,
      download: url(file),
      licenseUrl: url(licenseFile),
    })),
    tokens: {
      color: {
        neutral: group(b.neutrals, (c) => tok('color', c.hex, c.use)),
        dark: themeTokens('dark'),
        light: themeTokens('light'),
      },
      font: {
        ...group(b.fonts, (f) => tok('fontFamily', f.stack, f.role)),
        mono: tok('fontFamily', b.monoStack, 'Code and token values.'),
      },
      typography: group(b.typeScale, (t) =>
        tok(
          'typography',
          {
            fontFamily: `{font.${t.font}}`,
            fontWeight: t.weight,
            fontSize: t.size,
            lineHeight: t.lineHeight,
            letterSpacing: t.tracking,
            ...(t.transform ? { textTransform: t.transform } : {}),
          },
          t.use,
        ),
      ),
      radius: group(b.radii, (r) => tok('dimension', r.value, r.use)),
      space: group(b.spacing, (s) => tok('dimension', s.value)),
      motion: {
        ease: tok('cubicBezier', b.motion.ease.bezier, b.motion.ease.use, b.motion.ease.status),
        duration: group(b.motion.durations, (d) => tok('duration', d.value, d.use)),
      },
    },
    colorRules: b.colorRules,
    contrast: contrastTable(b),
    ring: b.ringRules,
    texture: b.texture,
    uiRules: b.uiRules,
    voice: b.voice,
    contact: `${b.SITE}${b.contactPath}`,
  }
  return `${JSON.stringify(data, null, 2)}\n`
}

// ---------------------------------------------------------------- brand.md

const cell = (v) => String(v).replace(/\|/g, '\\|')
const table = (headers, rows) =>
  [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((r) => `| ${r.map(cell).join(' | ')} |`),
  ].join('\n')
const bullets = (list) => list.map((l) => `- ${l}`).join('\n')
const code = (v) => `\`${v}\``

export function brandMd() {
  const fileLabel = (f) => `[${f.format}${f.width ? ` ${f.width}x${f.height}` : ''}](${url(f.file)})`

  return `# Lotru brand

Version ${b.meta.version}, updated ${b.meta.updated}.

${b.meta.summary}

- Human page: ${url()}
- Structured data: ${url('brand.json')}
- CSS variables: ${url('tokens.css')}

## Quick rules for agents

- Use the exact values below. Do not invent near-matches.
- Text font: Geist. Display accent: Fredoka 600. Default theme: dark (Night ${b.neutrals[0].hex} background, Paper ${b.neutrals.find((c) => c.id === 'paper').hex} text).
- Always use the supplied logo files. Never retype or redraw the logo.
- In copy, write "Lotru".

## Logo

${table(
  ['Asset', 'Use on', 'Usage', 'Downloads'],
  b.logos.map((l) => [l.title, l.background, l.use, l.files.map(fileLabel).join(', ')]),
)}

### Clear space

${b.logoRules.clearspace}

### Minimum size

${table(['Asset', 'Digital', 'Print'], b.logoRules.minimumSize.map((m) => [m.asset, m.digital, m.print]))}

### Choosing a file

${bullets(b.logoRules.selection)}

### Incorrect usage

${bullets(b.logoRules.misuse.map((m) => m.text))}

## Color

${bullets(b.colorRules)}

### Neutrals

${table(
  ['Name', 'CSS variable', 'Hex', 'RGB', 'HSL', 'Use'],
  b.neutrals.map((c) => [c.name, code(`--lotru-${c.id}`), c.hex, rgbText(c.hex), hslText(c.hex), c.use]),
)}

### Accent colors

\`--lotru-*\` variables switch with the theme.

${table(
  ['Name', 'CSS variable', 'Dark mode', 'Dark RGB', 'Dark HSL', 'Light mode', 'Light RGB', 'Light HSL'],
  b.accents.map((c) => [c.name, code(`--lotru-${c.id}`), c.dark, rgbText(c.dark), hslText(c.dark), c.light, rgbText(c.light), hslText(c.light)]),
)}

### Semantic colors

${table(
  ['Token', 'CSS variable', 'Dark theme', 'Light theme', 'Use'],
  b.semantic.map((t) => [t.id, code(`--lotru-${t.id}`), t.dark, t.light, t.use]),
)}

### Gradients

${b.gradients
  .map(
    (g) => `#### ${g.name} (${code(`--lotru-gradient-${g.id}`)})

${g.use}

- Dark: ${code(g.dark)}
- Light: ${code(g.light)}`,
  )
  .join('\n\n')}

### Contrast (WCAG 2)

${table(
  ['Theme', 'Foreground', 'Background', 'Ratio', 'Rating'],
  contrastTable(b).map((r) => [r.theme, r.foreground, r.background, `${r.ratio.toFixed(2)}:1`, r.rating]),
)}

## Typography

${table(
  ['Family', 'Role', 'Weights', 'CSS stack', 'Download', 'License'],
  b.fonts.map((f) => [f.family, f.role, f.weights, code(f.stack), `[WOFF2](${url(f.file)}), [full family](${f.source})`, `[${f.license}](${url(f.licenseFile)})`]),
)}

${bullets(b.fonts.map((f) => `${f.family}: ${f.notes}`))}

### Type scale

${table(
  ['Style', 'Family', 'Weight', 'Size', 'Line height', 'Tracking', 'Use'],
  b.typeScale.map((t) => [t.id, font(t.font).family, t.weight, code(t.size), t.lineHeight, `${t.tracking}${t.transform ? `, ${t.transform}` : ''}`, t.use]),
)}

## Ring of light

${b.ringRules.statement}

### Construction

${bullets(b.ringRules.construction)}

### Behavior

${table(['Property', 'Value', 'Notes'], b.ringRules.behavior.map((r) => [r.property, r.value, r.note]))}

### Texture

${b.texture.grain}

## UI tokens

${bullets(b.uiRules)}

### Radius

${table(['Token', 'CSS variable', 'Value', 'Use'], b.radii.map((r) => [r.id, code(`--lotru-radius-${r.id}`), r.value, r.use]))}

### Spacing (4 px base)

${table(['Token', 'CSS variable', 'Value'], b.spacing.map((s) => [s.id, code(`--lotru-space-${s.id}`), s.value]))}

### Motion

- Easing: ${code(b.motion.ease.value)} (${code('--lotru-ease')}). ${b.motion.ease.use}

${table(['Token', 'CSS variable', 'Value', 'Use'], b.motion.durations.map((d) => [d.id, code(`--lotru-duration-${d.id}`), d.value, d.use]))}

## Voice and messaging

### The name

${bullets(b.voice.name)}

### Titles

${bullets(b.voice.titles)}

### Tone

${table(['Trait', 'What it means'], b.voice.tone.map((t) => [t.trait, t.means]))}

### Examples

Do:

${bullets(b.voice.examples.do)}

Don't:

${bullets(b.voice.examples.dont)}

## Questions

${b.SITE}${b.contactPath}
`
}

// ---------------------------------------------------------------- llms.txt

export function llmsTxt() {
  return `# Lotru brand

> ${b.meta.summary} Version ${b.meta.version}, updated ${b.meta.updated}.

## Resources

${b.resources.map((r) => `- [${r.title}](${url(r.file)}): ${r.use}`).join('\n')}

## Logos

${b.logos.map((l) => `- [${l.title}](${url(l.files[0].file)}): ${l.use}`).join('\n')}

## Fonts

${b.fonts.map((f) => `- [${f.family}](${url(f.file)}): ${f.role}. ${f.notes}`).join('\n')}
`
}
