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

This repository is OpenSociety with the SABHA brand applied. Product flows, screens, and APIs stay OpenSociety. Only the name, colours, and typography change for the product surface.

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

## Retained technical names

These still say OpenSociety / opensociety because renaming them would break the monorepo, package graph, or mobile identifiers:

- npm workspace packages `@opensociety/*`
- Mobile URL schemes and bundle IDs `com.opensociety.app*`
- Upstream documentation that describes the OpenSociety architecture
