#!/usr/bin/env node
/**
 * Cloudflare Pages still expects a root `dist/` publish directory from the old SPA.
 * OpenSociety web is TanStack Start (SSR) under apps/web; this copies the client
 * assets and writes a static SABHA shell so Pages can publish a preview.
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

const assets = readdirSync(join(outDir, 'assets'))
const mainJs = assets.find((name) => /^main-.*\.js$/.test(name))
const stylesCss = assets.find((name) => /^styles-.*\.css$/.test(name))
if (!mainJs || !stylesCss) {
  console.error('Could not find main/styles assets in the web client build.')
  process.exit(1)
}

writeFileSync(
  join(outDir, 'index.html'),
  `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#031D27" />
    <meta name="description" content="SABHA is a Community Governance &amp; Transparency Platform. Clarity in Community." />
    <title>SABHA — Clarity in Community.</title>
    <link rel="icon" type="image/png" href="/icon-192.png" />
    <link rel="stylesheet" href="/assets/${stylesCss}" />
  </head>
  <body style="margin:0;font-family:Inter,system-ui,sans-serif;background:#031D27;color:#fff;min-height:100vh;display:flex;align-items:center;justify-content:center;">
    <main style="max-width:40rem;padding:2rem;text-align:center;">
      <p style="letter-spacing:0.12em;font-size:0.85rem;color:#00D4E8;margin:0 0 0.75rem;">SABHA</p>
      <h1 style="font-family:Manrope,Inter,sans-serif;font-size:2.5rem;margin:0 0 0.75rem;">Clarity in Community.</h1>
      <p style="color:#d6f6fa;line-height:1.5;margin:0 0 1.5rem;">
        Full product flows (guests, gate QR, bills, notices, admin) run as the OpenSociety app.
        Use Docker hosting or <code style="color:#00D4E8;">pnpm dev</code> locally for the live demo at <strong>/demo</strong>.
      </p>
      <p style="color:#9ec4cd;font-size:0.9rem;margin:0;">Cloudflare Pages serves this static preview shell. The Node web image serves the complete app.</p>
    </main>
    <script type="module" src="/assets/${mainJs}"></script>
  </body>
</html>
`,
)

writeFileSync(join(outDir, '_redirects'), '/*    /index.html   200\n')
console.log(`Cloudflare Pages dist ready (${mainJs}, ${stylesCss})`)
