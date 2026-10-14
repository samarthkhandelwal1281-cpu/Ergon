# Ergon landing page source

This folder contains the standalone editorial landing page source. The Worker routes ` to this page and keeps the existing frontend preview at `/app.

## Files
- `index.html` — semantic page markup
- `landing.css` — paper/navy editorial styles and responsive layout
- `landing.js` — accessible mobile navigation, Motion.dev progressive enhancement, reduced-motion support, and image fallbacks

## Local image assets still required
The GitHub repository does not currently contain these binary WebP files. The page shows clearly labeled fallbacks until they are added:
- `public/static/img/hero.webp`
- `public/static/img/band.webp`
- `public/static/img/shot-review.webp`
- `public/static/img/shot-board.webp`
- `public/static/img/shot-dashboard.webp`

The screenshot slots are not fabricated UI; use authentic captures from Ergon's Review, Board, and Dashboard once the image files can be added.

The existing repository is a browser-only preview: the landing copy therefore describes local rules analysis, no AI/API, browser-session-only state, and no team sync.
