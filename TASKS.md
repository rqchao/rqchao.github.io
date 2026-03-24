# Status Board Build Tasks

Legend: [ ] todo, [~] in progress, [x] done

## 0. Repo bootstrap
- [x] Initialize Astro project (TypeScript, content collections)
- [x] Add base layout, global styles, and fonts

## 1. Routing + content model
- [x] Create routes: `/`, `/blog`, `/blog/[slug]`, `/projects` (or section on `/`)
- [x] Define content collections:
  - `blog` markdown: title, date, tags, summary
  - `projects` json or collection: name, oneLiner, href, tags
  - `personal` config: engineeringNow, golfNow, languageNow

## 2. Home layout (status board)
- [x] Hero: name (H1), one-liner with period + `#hero-dot`
- [x] Links row: Resume / LinkedIn / GitHub / Email
- [x] Tiles: Projects, Writing (latest 3 + all), Personal (3 lines)
- [x] Data attributes: `data-obstacle` on tiles

## 3. Physics layer (Matter.js)
- [x] Canvas overlay (fixed, pointer-events none)
- [x] Ball spawn on hero-dot click; hide dot
- [x] Gravity + bounds + tile obstacles
- [x] Drag/pull/release interaction with aim line
- [x] Reset behavior (keyboard `R` + footer link)
- [x] ResizeObserver + window resize to rebuild bodies
- [x] Mobile disabled (pointer: coarse or max-width)

## 4. Collision feedback + audio
- [x] Tile hit class pulse (120–180ms)
- [x] Optional accent underline flash
- [x] Soft tap sound (WebAudio), volume low, randomized pitch
- [x] Rate limiting (80–120ms)
- [x] Sound toggle with localStorage

## 5. Styling
- [x] Colors + font stack applied
- [x] Tile borders light; titles use accent underline
- [x] Ball color #ededed (optional subtle texture)

## 6. QA
- [ ] Desktop: interactions work, collisions OK
- [ ] Mobile: physics disabled, layout intact
- [ ] Blog list/detail pages render markdown
