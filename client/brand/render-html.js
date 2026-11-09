// Renders the static body of lotru.com/brand. All content is in the HTML itself, so agents
// and no-JS clients read exactly what people see. brand.js only adds the theme toggle and copy.
import geo from '../src/logo-geometry.json'
import * as b from './brand.data.js'
import { esc, path, url, rgbText, hslText, contrast, contrastTable } from './lib.js'

const SECTIONS = [
  ['logo', 'Logo'],
  ['color', 'Color'],
  ['typography', 'Typography'],
  ['ring', 'Ring of light'],
  ['ui', 'UI tokens'],
  ['voice', 'Voice'],
]

const num = (i) => String(i + 1).padStart(2, '0')
const fontOf = (id) => b.fonts.find((f) => f.id === id)
const list = (items) => `<ul class="rules">${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`
const copy = (value, label = value) =>
  `<button type="button" class="copy" data-copy="${esc(value)}">${esc(label)}</button>`
const logoFile = (id, ext = 'svg') => path(`logos/lotru-${id}.${ext}`)

const table = (caption, headers, rows) => `<div class="table-wrap" tabindex="0" role="region" aria-label="${esc(caption)}">
<table><caption>${esc(caption)}</caption><thead><tr>${headers.map((h) => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead>
<tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`

function section(index, intro, body) {
  const [id, title] = SECTIONS[index]
  return `<section id="${id}" class="section" aria-labelledby="${id}-title">
  <header class="section-head">
    <p class="eyebrow">${num(index)}</p>
    <h2 id="${id}-title">${esc(title)}</h2>
    ${intro ? `<p class="lede">${esc(intro)}</p>` : ''}
  </header>
  ${body}
</section>`
}

const sub = (id, title, body) =>
  `<div class="sub" id="${id}"><h3>${esc(title)}</h3>${body}</div>`

// ---------------------------------------------------------------- logo

function fileLinks(files) {
  return files
    .map(
      (f) =>
        `<a class="dl" href="${path(f.file)}" download>${f.format}${f.width ? ` <span>${f.width}×${f.height}</span>` : ''}</a>`,
    )
    .join('')
}

function logoTile(l) {
  const img = `<img src="${path(l.files[0].file)}" alt="${esc(`Lotru ${l.title}`)}" ${
    l.kind === 'mark' ? 'class="logo-mark" width="512" height="512"' : 'class="logo-word" width="2252" height="810"'
  } loading="lazy">`
  return `<article class="asset">
  <div class="tile tile-${l.background}">${img}</div>
  <div class="asset-meta">
    <h4>${esc(l.title)}</h4>
    <p>${esc(l.use)}</p>
    <div class="dl-row">${fileLinks(l.files)}</div>
  </div>
</article>`
}

function clearspaceDiagram() {
  const [x, y, w, h] = geo.viewBox
  const R = geo.ring.r + geo.ring.stroke / 2
  const m = 30
  const vb = [x - R - m, y - R - m, w + 2 * R + 2 * m, h + 2 * R + 2 * m].map((v) => +v.toFixed(1))
  const marks = [
    [x + w / 2, y - R / 2],
    [x + w / 2, y + h + R / 2],
    [x - R / 2, y + h / 2],
    [x + w + R / 2, y + h / 2],
  ]
  return `<svg class="diagram" viewBox="${vb.join(' ')}" role="img" aria-label="The wordmark surrounded by clear space equal to one ring radius on every side">
  <path fill="currentColor" fill-opacity=".08" fill-rule="evenodd" d="M${x - R} ${y - R}h${w + 2 * R}v${h + 2 * R}h${-w - 2 * R}zM${x} ${y}h${w}v${h}h${-w}z"/>
  <g fill="none" stroke="currentColor" stroke-opacity=".5" stroke-width="3" stroke-dasharray="14 12">
    <rect x="${x - R}" y="${y - R}" width="${w + 2 * R}" height="${h + 2 * R}"/>
    <rect x="${x}" y="${y}" width="${w}" height="${h}"/>
    ${marks.map(([cx, cy]) => `<circle cx="${cx}" cy="${cy}" r="${R / 2}"/>`).join('')}
  </g>
  <g fill="currentColor" font-size="74" font-family="var(--lotru-font-text)" text-anchor="middle" dominant-baseline="central">
    ${marks.map(([cx, cy]) => `<text x="${cx}" y="${cy}">r</text>`).join('')}
  </g>
  <image href="${logoFile('logo-on-dark')}" x="${x}" y="${y}" width="${w}" height="${h}"/>
</svg>`
}

const MISUSE_LOGO = { contrast: 'logo-on-light' }

function misuseTile(m) {
  const inner =
    m.id === 'retype'
      ? '<span class="retyped" aria-hidden="true">lotru</span>'
      : `<img src="${logoFile(MISUSE_LOGO[m.id] ?? 'logo-on-dark')}" alt="" width="2252" height="810" loading="lazy">`
  return `<figure class="misuse misuse-${m.id}"><div class="tile tile-dark">${inner}<span class="cross" aria-hidden="true"></span></div><figcaption>${esc(m.text)}</figcaption></figure>`
}

function logoSection() {
  const words = b.logos.filter((l) => l.kind === 'wordmark')
  const marks = b.logos.filter((l) => l.kind === 'mark')
  return section(
    0,
    'The wordmark is Fredoka letters with the ring of light as the “o”. Download the files below rather than redrawing it.',
    `${sub('logo-wordmark', 'Wordmark', `<div class="grid-2">${words.map(logoTile).join('')}</div>`)}
${sub('logo-mark', 'Ring mark', `<div class="grid-2">${marks.map(logoTile).join('')}</div>`)}
${sub('logo-clearspace', 'Clear space', `<div class="tile tile-dark tile-diagram">${clearspaceDiagram()}</div><p class="note">${esc(b.logoRules.clearspace)}</p>`)}
${sub('logo-minimum', 'Minimum size', table('Minimum logo sizes', ['Asset', 'Digital', 'Print'], b.logoRules.minimumSize.map((m) => [esc(m.asset), esc(m.digital), esc(m.print)])))}
${sub('logo-selection', 'Choosing a file', list(b.logoRules.selection))}
${sub('logo-misuse', 'Incorrect usage', `<div class="grid-3">${b.logoRules.misuse.map(misuseTile).join('')}</div>`)}`,
  )
}

// ---------------------------------------------------------------- color

const inkOn = (hex) => {
  const [night, paper] = ['night', 'paper'].map((id) => b.neutrals.find((c) => c.id === id).hex)
  return contrast(night, hex) >= contrast(paper, hex) ? night : paper
}

// Every color card has the same anatomy: chip with hex values, name, CSS variable, details.
const chipValue = (name, label, hex) =>
  `<button type="button" class="chip-value" data-copy="${hex}" style="background:${hex};color:${inkOn(hex)}" aria-label="Copy ${esc(name)} ${label} ${hex}"><span>${label}</span><strong>${hex}</strong></button>`

const swatchHead = (c) =>
  `<header class="swatch-head"><h4>${esc(c.name)}</h4>${copy(`var(--lotru-${c.id})`, `--lotru-${c.id}`)}</header>`

const row = (term, value) => `<div><dt>${term}</dt><dd>${esc(value)}</dd></div>`

function neutralCard(c) {
  return `<article class="swatch">
  <div class="chip">${chipValue(c.name, 'Hex', c.hex)}</div>
  <div class="swatch-meta">
    ${swatchHead(c)}
    <p>${esc(c.use)}</p>
    <dl>${row('RGB', rgbText(c.hex))}${row('HSL', hslText(c.hex))}</dl>
  </div>
</article>`
}

function accentCard(c) {
  return `<article class="swatch">
  <div class="chip chip-pair">${chipValue(c.name, 'Dark mode', c.dark)}${chipValue(c.name, 'Light mode', c.light)}</div>
  <div class="swatch-meta">
    ${swatchHead(c)}
    <dl>${row('Dark RGB', rgbText(c.dark))}${row('Dark HSL', hslText(c.dark))}${row('Light RGB', rgbText(c.light))}${row('Light HSL', hslText(c.light))}</dl>
  </div>
</article>`
}

function gradientBlock(g) {
  const demo = (theme) => {
    const preview =
      g.id === 'ring'
        ? `<span class="demo-ring" style="background:${g[theme]}"></span>`
        : `<span class="demo-glow" style="background-image:${g[theme]}">Accent phrase</span>`
    return `<figure class="grad">
      <div class="tile tile-${theme}">${preview}</div>
      <figcaption><strong>On ${theme}</strong><code>${esc(g[theme])}</code>${copy(g[theme], 'Copy CSS')}</figcaption>
    </figure>`
  }
  return `<article class="gradient">
    <h4>${esc(g.name)}</h4>
    <p>${esc(g.use)}</p>
    <div class="grid-2">${demo('dark')}${demo('light')}</div>
  </article>`
}

function colorSection() {
  const semanticRows = b.semantic.map((t) => [
    `<code>--lotru-${t.id}</code>`,
    `<span class="dot" style="background:${t.dark}"></span> ${esc(t.dark)}`,
    `<span class="dot" style="background:${t.light}"></span> ${esc(t.light)}`,
    esc(t.use),
  ])
  const contrastRows = contrastTable(b).map((r) => [
    esc(r.theme),
    esc(r.foreground),
    esc(r.background),
    `${r.ratio.toFixed(2)}:1`,
    esc(r.rating),
  ])
  return section(
    1,
    'Warm neutrals carry the page. Accents add the color. Click any color to copy its hex value.',
    `${sub('color-neutrals', 'Neutrals', `<div class="grid-swatch grid-four">${b.neutrals.map(neutralCard).join('')}</div>`)}
${sub('color-accents', 'Accent colors', `<div class="grid-swatch grid-five">${b.accents.map(accentCard).join('')}</div>`)}
${sub('color-gradients', 'Gradients', b.gradients.map(gradientBlock).join(''))}
${sub('color-semantic', 'Semantic colors', table('Semantic colors by theme', ['Variable', 'Dark theme', 'Light theme', 'Use'], semanticRows))}
${sub('color-contrast', 'Contrast', table('WCAG 2 contrast ratios', ['Theme', 'Foreground', 'Background', 'Ratio', 'Rating'], contrastRows))}
${sub('color-rules', 'Using color', list(b.colorRules))}`,
  )
}

// ---------------------------------------------------------------- type

function fontCard(f) {
  return `<article class="font font-${f.id}">
  <p class="font-sample" style="font-family:var(--lotru-font-${f.id})">${esc(f.sample)}</p>
  <div class="font-meta">
    <h4>${esc(f.family)}</h4>
    <p>${esc(f.notes)}</p>
    <dl>
      <div><dt>Role</dt><dd>${esc(f.role)}</dd></div>
      <div><dt>Weights</dt><dd>${esc(f.weights)}</dd></div>
      <div><dt>Stack</dt><dd>${copy(f.stack)}</dd></div>
      <div><dt>License</dt><dd><a href="${path(f.licenseFile)}">${esc(f.license)}</a></dd></div>
    </dl>
    <div class="dl-row">
      <a class="dl" href="${path(f.file)}" download>WOFF2</a>
      <a class="dl dl-out" href="${f.source}" rel="noopener">Full family</a>
    </div>
  </div>
</article>`
}

function typeRow(t) {
  const style = [
    `font-family:var(--lotru-font-${t.font})`,
    `font-weight:${t.weight}`,
    `font-size:${t.size}`,
    `line-height:${t.lineHeight}`,
    `letter-spacing:${t.tracking}`,
    t.transform ? `text-transform:${t.transform}` : '',
  ]
    .filter(Boolean)
    .join(';')
  const specs = [
    fontOf(t.font).family,
    `Weight ${t.weight}`,
    t.size,
    `Line ${t.lineHeight}`,
    `Tracking ${t.tracking}`,
    t.transform,
  ].filter(Boolean)
  return `<article class="type-row">
  <header><h4><code>${esc(t.id)}</code></h4><p>${esc(t.use)}</p></header>
  <p class="type-sample" style="${esc(style)}">${esc(t.sample)}</p>
  <p class="type-spec">${specs.map(esc).join(' · ')}</p>
</article>`
}

function typeSection() {
  return section(
    2,
    'Geist does the talking. Fredoka adds the logo’s rounded voice, one short phrase at a time.',
    `${sub('type-families', 'Typefaces', `<div class="grid-2">${b.fonts.map(fontCard).join('')}</div>`)}
${sub('type-scale', 'Type scale', `<div class="type-list">${b.typeScale.map(typeRow).join('')}</div>`)}`,
  )
}

// ---------------------------------------------------------------- ring

function constructionDiagram() {
  const [x, y, w, h] = geo.viewBox
  const { cx, cy, r, stroke } = geo.ring
  const outer = r + stroke / 2
  const inner = r - stroke / 2
  const xHeight = (outer * 2) / 1.04
  const baseline = 0
  const xLine = -xHeight
  const pad = { l: 40, t: 40, r: 420, b: 200 }
  const vb = [x - pad.l, y - pad.t, w + pad.l + pad.r, h + pad.t + pad.b].map((v) => +v.toFixed(1))
  const right = x + w + 30
  return `<svg class="diagram" viewBox="${vb.join(' ')}" role="img" aria-label="Construction of the wordmark: the ring sits between the baseline and x-height with a small overshoot, and the letters are knocked out around it">
  <defs><mask id="ck" maskUnits="userSpaceOnUse" x="${x}" y="${y}" width="${w}" height="${h}"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#fff"/><circle cx="${cx}" cy="${cy}" r="${geo.knockoutRadius}" fill="#000"/></mask></defs>
  <path d="${geo.letters}" fill="currentColor" fill-opacity=".42" mask="url(#ck)"/>
  <g fill="none" stroke="currentColor" stroke-width="4">
    <circle cx="${cx}" cy="${cy}" r="${outer}"/>
    <circle cx="${cx}" cy="${cy}" r="${inner}"/>
    <circle cx="${cx}" cy="${cy}" r="${geo.knockoutRadius}" stroke-dasharray="12 12" stroke-opacity=".6"/>
    <path d="M${x} ${baseline}H${right}M${x} ${xLine}H${right}" stroke-dasharray="4 12" stroke-opacity=".7"/>
    <path d="M${cx - 26} ${cy}h52M${cx} ${cy - 26}v52" stroke-opacity=".7"/>
  </g>
  <g fill="currentColor" font-size="46" font-family="var(--lotru-font-text)">
    <text x="${right + 14}" y="${baseline + 15}">baseline</text>
    <text x="${right + 14}" y="${xLine + 15}">x-height</text>
    <text x="${cx}" y="${baseline + 168}" text-anchor="middle">ring = x-height + 4%</text>
  </g>
</svg>`
}

function ringSection() {
  return section(
    3,
    b.ringRules.statement,
    `${sub('ring-construction', 'Construction', `<div class="tile tile-theme tile-diagram">${constructionDiagram()}</div>${list(b.ringRules.construction)}`)}
${sub('ring-behavior', 'Behavior', table('Ring behavior', ['Property', 'Value', 'Notes'], b.ringRules.behavior.map((r) => [esc(r.property), esc(r.value), esc(r.note)])))}
${sub('ring-texture', 'Texture', `<p class="note">${esc(b.texture.grain)}</p>`)}`,
  )
}

// ---------------------------------------------------------------- ui tokens

function uiSection() {
  return section(
    4,
    'Copy tokens.css into a project to use all of these.',
    `${sub('ui-control', 'Control', `<div class="tile tile-theme tile-control"><a class="pill" href="#ui">Get in touch</a></div>`)}
${sub('ui-radius', 'Radius', `<div class="radii">${b.radii.map((r) => `<div class="radius"><span style="border-radius:${r.value}"></span><code>--lotru-radius-${r.id}</code><small>${r.value}</small></div>`).join('')}</div>
${table('Radius tokens', ['Variable', 'Value', 'Use'], b.radii.map((r) => [`<code>--lotru-radius-${r.id}</code>`, r.value, esc(r.use)]))}`)}
${sub('ui-spacing', 'Spacing', `<p class="note">A 4 px base.</p><div class="spaces">${b.spacing.map((s) => `<div><span style="width:${s.value}"></span><code>--lotru-space-${s.id}</code><small>${s.value}</small></div>`).join('')}</div>`)}
${sub('ui-motion', 'Motion', `<p class="note">${esc(b.motion.ease.use)} ${copy(b.motion.ease.value)}</p>
${table('Motion durations', ['Variable', 'Value', 'Use'], b.motion.durations.map((d) => [`<code>--lotru-duration-${d.id}</code>`, d.value, esc(d.use)]))}`)}
${sub('ui-rules', 'Building interfaces', list(b.uiRules))}`,
  )
}

// ---------------------------------------------------------------- voice

function voiceSection() {
  const v = b.voice
  return section(
    5,
    'Calm, plain and warm.',
    `<p class="title-example"><span>${esc(v.titleExample.lead)}</span> <span class="glow">${esc(v.titleExample.accent)}</span></p>
${sub('voice-titles', 'Titles', list(v.titles))}
${sub('voice-name', 'The name', list(v.name))}
${sub('voice-tone', 'Tone', `<div class="tone">${v.tone.map((t) => `<article><h4>${esc(t.trait)}</h4><p>${esc(t.means)}</p></article>`).join('')}</div>`)}
${sub(
  'voice-examples',
  'Examples',
  `<div class="grid-2 examples"><div><h4>Do</h4>${list(v.examples.do)}</div><div><h4>Don’t</h4>${list(v.examples.dont)}</div></div>`,
)}`,
  )
}

// ---------------------------------------------------------------- page

function agentsBlock() {
  const snippet = `Lotru brand reference: ${url('brand.md')} (full spec), ${url('brand.json')} (tokens and asset URLs). Use these exact values. Never redraw the logo.`
  return `<section id="agents" class="agents" aria-labelledby="agents-title">
  <h2 id="agents-title" class="eyebrow">For agents</h2>
  <p>Everything on this page is also published as plain files. Start with <a href="${path('brand.md')}">brand.md</a>.</p>
  ${table(
    'Machine-readable resources',
    ['Resource', 'URL', 'Use'],
    b.resources.map((r) => [esc(r.format), `<a href="${path(r.file)}"><span class="origin">${esc(b.SITE)}</span>${esc(path(r.file))}</a>`, esc(r.use)]),
  )}
  <div class="snippet"><h3>Paste into CLAUDE.md or AGENTS.md</h3><pre><code>${esc(snippet)}</code></pre>${copy(snippet, 'Copy')}</div>
</section>`
}

export function renderBody() {
  const year = b.meta.updated.slice(0, 4)
  const themedLogo = `<img class="only-dark" src="${logoFile('logo-on-dark')}" alt="Lotru" width="2252" height="810"><img class="only-light" src="${logoFile('logo-on-light')}" alt="" width="2252" height="810">`
  return `<a class="skip" href="#content">Skip to content</a>
<header class="top" id="top">
  <a class="top-logo" href="#top">${themedLogo}</a>
  <span class="top-title">Brand</span>
  <button type="button" class="theme-toggle" data-theme-toggle hidden></button>
</header>
<div class="layout">
  <nav class="rail" aria-label="Sections">
    <ol>
      ${SECTIONS.map(([id, title], i) => `<li><a href="#${id}"><span>${num(i)}</span>${esc(title)}</a></li>`).join('\n      ')}
      <li class="rail-agents"><a href="#agents">For agents</a></li>
    </ol>
  </nav>
  <main id="content">
    <section class="hero" aria-labelledby="page-title">
      <div class="hero-copy">
        <h1 id="page-title"><span>Lotru</span> <span class="glow">brand</span></h1>
        <p class="lede">${esc(b.meta.summary)}</p>
        <p class="meta">Version ${esc(b.meta.version)} · updated <time datetime="${b.meta.updated}">${esc(b.meta.updated)}</time></p>
      </div>
      <div class="hero-ring" aria-hidden="true"><i></i><b></b></div>
    </section>
    ${agentsBlock()}
    ${logoSection()}
    ${colorSection()}
    ${typeSection()}
    ${ringSection()}
    ${uiSection()}
    ${voiceSection()}
    <footer class="foot">
      <p>Questions? <a href="${b.contactPath}">lotru.com${b.contactPath}</a></p>
      <p><a href="#top">Back to top</a></p>
      <p class="caption">© ${year} Lotru</p>
    </footer>
  </main>
</div>
<div class="sr-status" role="status" aria-live="polite" data-copy-status></div>`
}
