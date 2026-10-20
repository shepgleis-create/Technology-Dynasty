# Technology Dynasty

A technology-industry management simulator derived from the user's Motor Dynasty game, intentionally retaining its nine-workspace interface, accounting, research, corporate, factories, subsidiaries, rival AI, operations, product life cycle, and saved-game engine.

## What is implemented
- Imported every original root application module, scripts and app assets, including licensed typeface files, into this separate repository.
- Renamed the application, manifest, install icon, main menu, and navigation with an initial industry terminology layer.
- Added 68 technology-company profiles with period-aware founding years, used to populate the inherited rival-company schema while preserving internal simulation identifiers.
- Preserved the original workspace IDs and functionality to minimize regression risk.
- Namespaced the service worker cache and enabled portrait-friendly PWA installation.
- Copied original regression tests and set up Technology Dynasty-specific CI.

## What is not finished
The engine remains the Motor Dynasty simulation under the new identity. That means some car-derived engineering parameters, product visual models, per-model economics, rival events, and production logic still need a proper computer/phone/chip conversion. This first version is a **working-code port and identity pass**, not a verified finished technology business simulator. Do not represent vehicle artwork as finished electronics artwork.

## Local run
`npm ci` then `npm run dev`; `npm run build` creates `dist`. `npm test` runs the inherited tests.

## Independence
Motor Dynasty is not changed. This repository needs its own Vercel project and origin so browser saves cannot collide with Motor Dynasty.
