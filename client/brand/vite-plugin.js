// Builds lotru.com/brand: injects the generated body and tokens into brand/index.html,
// and publishes the machine-readable files next to it, in dev, preview and production.
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { fonts, logos } from './brand.data.js'
import { renderBody } from './render-html.js'
import { brandJson, brandMd, llmsTxt, tokensCss } from './render-data.js'

const FILES = {
  'brand.md': { type: 'text/markdown; charset=utf-8', render: brandMd },
  'brand.json': { type: 'application/json; charset=utf-8', render: brandJson },
  'tokens.css': { type: 'text/css; charset=utf-8', render: tokensCss },
  'llms.txt': { type: 'text/plain; charset=utf-8', render: llmsTxt },
}

// Serves /brand (no trailing slash) and the generated files.
function serve(req, res, next) {
  const pathname = req.url.split('?')[0]
  if (pathname === '/brand') {
    res.statusCode = 302
    res.setHeader('Location', '/brand/')
    res.end()
    return
  }
  const file = pathname.startsWith('/brand/') ? FILES[pathname.slice('/brand/'.length)] : undefined
  if (!file) return next()
  res.setHeader('Content-Type', file.type)
  res.end(file.render())
}

export function brandPage() {
  let root
  return {
    name: 'lotru-brand-page',
    configResolved(config) {
      root = config.root
    },
    configureServer: (server) => void server.middlewares.use(serve),
    configurePreviewServer: (server) => void server.middlewares.use(serve),
    buildStart() {
      // A typo in brand.data.js should fail the build, not ship a dead download link.
      const published = [
        ...logos.flatMap((l) => l.files.map((f) => f.file)),
        ...fonts.flatMap((f) => [f.file, f.licenseFile]),
      ]
      const missing = published.filter((f) => !existsSync(resolve(root, 'public/brand', f)))
      if (missing.length) this.error(`Brand page references missing files: ${missing.join(', ')}`)
    },
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        if (!ctx.path.startsWith('/brand/')) return html
        return html
          .replace('<!--brand-tokens-->', () => `<style>\n${tokensCss()}</style>`)
          .replace('<!--brand-body-->', () => renderBody())
      },
    },
    generateBundle() {
      for (const [name, file] of Object.entries(FILES)) {
        this.emitFile({ type: 'asset', fileName: `brand/${name}`, source: file.render() })
      }
    },
  }
}
