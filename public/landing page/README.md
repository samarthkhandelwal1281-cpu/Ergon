# Ergon landing page source

This folder contains the standalone editorial landing page. The Worker serves public/landing page/index.html at / and keeps the existing frontend preview at /app. The Open Ergon actions and clickable feature frames point to https://ergon-prbahn.camelai.app/.

## Motion
The page reuses the repository's locally bundled Motion.dev helper at /motion-kit.js. It uses the existing ergonMotion API for the wordmark draw, staggered entrance, in-view reveals, button hover/press, gentle background drift, reduced-motion behavior, and pausing drift when the tab is hidden. Section links scroll smoothly; reduced-motion users get instant navigation.

## Feature-image source status
The supplied site is a client-rendered application and does not expose Review, Board, or Dashboard screenshot files. Its public CSS contains only the grain texture as an image; the Open Graph SVG is generic starter art, so it is not used as a product screenshot. The page keeps labeled fallbacks for the local image files below rather than inventing screenshots. The feature frames open the supplied live app.

Add authentic, optimized image files at these paths to replace the fallbacks:
- public/static/img/hero.webp
- public/static/img/band.webp
- public/static/img/shot-review.webp
- public/static/img/shot-board.webp
- public/static/img/shot-dashboard.webp

The landing-page privacy copy reflects this repository's browser-only preview: local rules, no AI/API call, no shared team sync, and session-only state.
