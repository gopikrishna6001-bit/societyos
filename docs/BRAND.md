# SABHA brand

## Product name

SABHA

Use the name in uppercase for the wordmark. Do not set it in sentence case or as “Sabha OS”.

## Tagline

Clarity in Community.

## Product descriptor

Community Governance & Transparency Platform

## Brand promise

Every rupee. Every decision. Accounted for.

## What this repository is

This repository is the SABHA product monorepo. All packages, mobile identifiers, and deploy names use SABHA (`@sabha/*`, `com.sabha.app*`). There is no runtime dependency on an external OpenSociety service or package registry.

Preserve the full capability set in [SABHA-CAPABILITY-INVENTORY.md](./SABHA-CAPABILITY-INVENTORY.md) when changing product surfaces.

## Voice

The interface should read as a record: precise, calm, and checkable. It should communicate financial transparency, clear reporting, accountable leadership, democratic participation, and trust through verifiable information.

Avoid generic apartment-management slogans, decorative cultural motifs, a government-portal look, heavy gradients, and real-estate or retail visual language.

## Colour

| Role | Value | Use |
| --- | --- | --- |
| Navy | `#031D27` | Chrome, dark surfaces, browser theme |
| Cyan | `#00D4E8` | Accent, current navigation, mark on navy |
| Blue | `#0878E8` | Primary buttons. White text on this blue is the button label. |
| White | `#FFFFFF` | Cards, button labels, and text on navy |

Manrope is used for the wordmark and headings. Inter is used for interface text.

## Mark

Brand SVG/PNG assets live under `public/brand/` and `apps/web/public/brand/`.

## Technical names

- npm workspace packages `@sabha/*`
- Mobile URL schemes and bundle IDs `com.sabha.app*` / `sabha` / `sabha-dev`
- Pre-approval QR prefix `SABHA-PA:` (legacy `OS-PA:` still accepted when scanning)
