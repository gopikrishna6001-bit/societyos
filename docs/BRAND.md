# SABHA brand

## Product name

SABHA

Use the name in uppercase for the wordmark. Do not set it in sentence case or as “Sabha OS”.

## Tagline

Clarity in Every Community.

## Product descriptor

Community Governance & Transparency Platform

## Brand promise

Every rupee. Every decision. Accounted for.

## What the name replaces

SABHA is the product name for the application previously presented as SocietyOS. User-facing titles, the sign-in screen, navigation, the installable app name, and this documentation use SABHA.

## Voice

The interface should read as a record: precise, calm, and checkable. It should communicate financial transparency, clear reporting, accountable leadership, democratic participation, and trust through verifiable information.

Avoid generic apartment-management slogans, decorative cultural motifs, a government-portal look, heavy gradients, and real-estate or retail visual language.

## Colour

| Role | Value | Use |
| --- | --- | --- |
| Paper | `#f7f4ee` | Page background and PWA background |
| Ink | `#1c1917` | Primary text and the wordmark on paper |
| Pine | `#0f6b56` | The mark, primary buttons, and the theme colour |
| Cream | `#f7f4ee` | The wordmark and mark on a dark surface |

Do not introduce a second accent. Amounts stay in the same ink as the surrounding text so a colour is not doing the work of a number.

## Mark

The mark is an open ring with one horizontal stroke. The ring stands for an assembly. The stroke stands for a line in a record. It is not a building, a seal, or a flag.

It is drawn in `currentColor` in the app and as a pine stroke in the default SVG, so the same geometry works on paper and on a dark bar.

## Assets

| File | Use |
| --- | --- |
| `public/favicon.svg` | Browser tab icon |
| `public/brand/sabha-mark.svg` | Mark on a light surface |
| `public/brand/sabha-mark-light.svg` | Mark on a dark surface |
| `public/brand/sabha-wordmark.svg` | Wordmark for light backgrounds |
| `public/brand/sabha-wordmark-light.svg` | Wordmark for dark backgrounds |
| `public/icon-192.png`, `public/icon-512.png` | PWA icons |
| `public/icon-maskable-192.png`, `public/icon-maskable-512.png` | Maskable PWA icons |
| `public/apple-touch-icon.png` | Home-screen icon on Apple browsers |
| `src/brand.js` | Name, tagline, descriptor, and promise |
| `src/brand/Mark.jsx` | Mark and wordmark used in the interface |

Change the strings in `src/brand.js` when the name or tagline changes, then update this document and `index.html` to match. `index.html` cannot import that module, so the document title and meta description are duplicated there on purpose.

## Retained technical names

These still say SocietyOS because renaming them would break an integration or a saved session:

- The npm package name `societyos`.
- The repository and the Cloudflare host `societyos.pages.dev`.
- The module `src/SocietyOS.jsx` and the local variable that loads it.
- The browser storage key `societyos_auth`.
- The legacy synthetic address `*@societyos.app` created by the phone sign-in function.
- The local test database `societyos_test`.
- Environment variables `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_AUTH_URL`, and `VITE_SOCIETY_ID`.
- Database tables, functions, migration filenames, and the default WhatsApp verify token `societyos_verify_2026`.
- Existing links to `https://societyos.pages.dev` in the legacy payment reminder and the WhatsApp bot. That hostname is the current deployment.
- Historical notes that describe the earlier product or the unused `supabase/schema.sql`.
