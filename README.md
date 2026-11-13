# Young-Tak Kim

Academic homepage: **https://young-tak.github.io/**

Static HTML, CSS, and JavaScript, published with GitHub Pages from the
`main` branch and repository root. No build step or dependency installation.

## Updating the website

- `index.html`: introduction, research, publications, and background.
- `refinements.css` and `styles.css`: typography and layout.
- `entrance.css` and `entrance.js`: opening screen and immediate entry to the profile.
- `ocean.js`: lightweight canvas wave mesh, with pause and reduced-motion support.
- `app.js`: publication filters, navigation, and video controls.
- `assets/`: CV, research films, cover image, photographs, fonts, and icons.

Edit the files and push to `main`; GitHub Pages publishes the update.
For a local preview, run `python -m http.server 8000` and open
`http://localhost:8000`.

The initial release uses the approved version 15 of the website.
Asset attribution and license notices are retained alongside the assets.

The root URL opens with a typographic landing screen. Its links enter the existing
profile at `#research`; any section hash opens the profile directly, preserving
shared links. Browser Back returns to the opening screen. Without JavaScript,
the full profile remains accessible. Both views use a plain white background.

## Private website analytics

The owner dashboard is at `https://young-tak.github.io/admin/`.
It is intentionally absent from the public navigation and requires server-verified
login. The public files contain no credentials or password verification logic.

- `analytics.js`: lightweight, optional collection on the homepage.
- `admin/`: login, reports, and CSV export.
- `privacy/`: collection details and a browser-level opt-out.

The API and database run separately on Sites at
`https://youngtak-site-analytics.wellchar512.chatgpt.site`.
Authentication secrets are configured as server runtime environment variables.
Reports cover the most recent 90 days. Older records are pruned during later
service requests. Logging begins with this installation; past visits cannot be
reconstructed. Login automatically excludes that browser's subsequent visits.

An ordinary static preview does not include the analytics API. The production
dashboard only talks to the configured API; authentication is never simulated.
