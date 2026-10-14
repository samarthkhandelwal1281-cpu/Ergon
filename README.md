# Ergon

Ergon is a minimalist meeting-to-task frontend with transcript review, promise clarity scoring, an approval flow, a To Do / Doing / Done board, and a Meeting Debt dashboard.

## Frontend preview scope

This repository contains a standalone, client-side preview. The transcript upload and profile/team details stay in the current browser session. No AI service, API, account system, shared team membership, or persistent task store is connected. The example transcript is explicitly labeled as sample content; typed transcripts use a small local rules preview, not an AI model.

## Run locally

Requirements: Bun and Node.js.

```sh
bun install
bun run build
bun run dev
```

The build bundles Motion 12 into `public/vendor/motion.js` so the browser loads it locally. `public/motion-kit.js` provides the progressive-enhancement helpers; the interface remains usable with reduced motion and when Motion is unavailable.

## Project layout

- `public/index.html` — Profile landing, Review, Board, Dashboard, Settings, and Help Center views.
- `public/styles.css` — Paper/Night design tokens, responsive layouts, interaction states, and accessible focus styles.
- `public/main.js` — Frontend-only in-memory interactions, local rules preview, charts, and profile/team demo state.
- `public/motion-kit.js` — Motion.dev interactions.
- `scripts/motion-entry.js` — local Motion package entry used by the build.
- `scripts/build.mjs` — validates the browser modules, bundles Motion, and stages the Worker assets.
- `worker.js` — static asset handler only.

No transcript, profile data, team membership, or task state is written to a backend or local storage.