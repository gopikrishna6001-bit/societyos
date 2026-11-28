#!/usr/bin/env node
/**
 * Cloudflare Pages publishes root `dist/`.
 * Prefer prerendered TanStack HTML from the web client build; only fall back to
 * a static SABHA shell when prerender did not run.
 */
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const root = new URL('..', import.meta.url).pathname
const clientDir = join(root, 'apps/web/dist/client')
const outDir = join(root, 'dist')

if (!existsSync(clientDir)) {
  console.error('Missing apps/web/dist/client — run the web build first.')
  process.exit(1)
}

rmSync(outDir, { recursive: true, force: true })
mkdirSync(outDir, { recursive: true })
cpSync(clientDir, outDir, { recursive: true })

if (existsSync(join(outDir, 'index.html'))) {
  writeFileSync(join(outDir, '_redirects'), '/*    /index.html   200\n')
  console.log('Cloudflare Pages dist ready (prerendered SABHA/SABHA app)')
  process.exit(0)
}

const assets = existsSync(join(outDir, 'assets')) ? readdirSync(join(outDir, 'assets')) : []
const stylesCss = assets.find((name) => /^styles-.*\.css$/.test(name))

writeFileSync(
  join(outDir, 'index.html'),
  `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#031D27" />
    <title>SABHA — Clarity in Community.</title>
    ${stylesCss ? `<link rel="stylesheet" href="/assets/${stylesCss}" />` : ''}
  </head>
  <body style="margin:0;font-family:Inter,system-ui,sans-serif;background:#031D27;color:#fff;min-height:100vh;display:flex;align-items:center;justify-content:center;">
    <main style="max-width:40rem;padding:2rem;text-align:center;">
      <p style="letter-spacing:0.12em;font-size:0.85rem;color:#00D4E8;">SABHA</p>
      <h1 style="font-family:Manrope,Inter,sans-serif;font-size:2.5rem;">Clarity in Community.</h1>
      <p style="color:#d6f6fa;line-height:1.5;">The interactive app needs a prerendered or Node build. Open <a href="/demo" style="color:#00D4E8;">/demo</a> after rebuilding with CF_PAGES=1.</p>
    </main>
  </body>
</html>
`,
)
writeFileSync(join(outDir, '_redirects'), '/*    /index.html   200\n')
console.log('Cloudflare Pages dist ready (static shell fallback — no prerendered index.html)')
