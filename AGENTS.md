# Repository Guidelines

## Project Structure & Module Organization
- `src/pages/` defines routes (`index.astro`, `blog/`, `projects.astro`).
- `src/content/` holds content collections: `blog/*.md`, `projects/projects.json`, `personal/status.json`.
- `src/layouts/` contains shared layouts (`BaseLayout.astro`).
- `src/components/` contains small UI components (`ItemList.astro`).
- `src/styles/` holds global styles (`global.css`).
- `public/` is for static assets (e.g., `resume.pdf`, icons).

## Build, Test, and Development Commands
- `npm install`: install dependencies.
- `npm run dev`: run the local dev server (default `http://localhost:4321`).
- `npm run build`: produce a production build in `dist/`.
- `npm run preview`: preview the production build locally.
- `npm run astro check`: run Astro’s type/content checks (if needed).

## Coding Style & Naming Conventions
- Use tabs for indentation in `.astro`/`.css` (match existing files).
- Prefer short, descriptive component names (`ItemList.astro`).
- Content entries live in `src/content` and follow the collection schema:
  - `blog/*.md` with frontmatter `title`, `date`, `tags`, `summary`.
  - `projects/projects.json` with `name`, `oneLiner`, `href`, `tags`.
  - `personal/status.json` with `engineeringNow`, `golfNow`, `languageNow`.
- Site-level constants live in `src/config/site.ts`.

## Testing Guidelines
- No automated tests are configured yet.
- If you add tests, document the runner and provide a `npm run test` script.

## Commit & Pull Request Guidelines
- Git history is minimal (single “simple draft” commit), so no convention is established.
- Use concise, imperative commit messages (e.g., “Add blog list page”).
- PRs should include a short summary, a checklist of changes, and screenshots for UI updates.

## Notes for Agents
- Keep content and links centralized in `src/config/site.ts`.
- Avoid introducing new dependencies unless required for planned features.
