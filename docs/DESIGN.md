# GitNapse Desktop — Design System (F3)

Documented surface: the frontend of `desktop/` (React 19 + Vite 8 + TS strict),
the glass token contract, the typed bridge, and the audit numbers for every
glass surface shipped in F3. Code carries no comments; this file is the
documentation.

## 1. Sources of truth

| Source | Used for |
|---|---|
| `WORKSPACE.md` §4–§6 | frozen command contract, core git DTOs, doctrine synthesis |
| `xglassmorphism` skill + refs 01–05, 08 | five-layer glass, token contract, fallbacks, a11y, Tauri |
| `samurai` skill + refs design-tokens, component-patterns | typography, monochrome canvas, status-as-event, component grammar |

## 2. Architecture (F3 scope)

- React 19, Vite 8, TypeScript strict (`noUncheckedIndexedAccess`, `verbatimModuleSyntax`).
- `HashRouter` (react-router 7). Hash routing is immune to Tauri's custom
  protocol/`file://` serving and needs no server rewrite rules; the trade-off is
  `#/` URLs, acceptable for a desktop shell.
- React Query 5 owns server data; the shell mounts one `QueryClient`
  (staleTime 30 s, retry 1, no refetch on focus).
- `src/lib/bridge.ts` is the **only** module importing `@tauri-apps/api` and
  `@tauri-apps/plugin-dialog`. In a plain browser `isTauri()` is false and the
  same typed calls resolve against `src/lib/mock.ts` (preview mode, banner shown
  in the shell). Command arguments are camelCase in JS; payloads are snake_case
  DTOs mirrored in `src/lib/types.ts`.
- Lazy routes per view; repo child tabs lazy per tab. Theme controller handles
  dark/light/system + glass level + reduce-transparency, persisted in
  `localStorage` and applied as `data-*` attributes before first paint
  (inline boot script in `index.html`).

## 3. Token inventory

### 3.1 Primitives (`src/styles/tokens.css`)

| Group | Tokens | Values |
|---|---|---|
| Alpha | `--alpha-04 … --alpha-95` | 0.04, 0.06, 0.08, 0.10, 0.12, 0.16, 0.20, 0.28, 0.35, 0.45, 0.55, 0.62, 0.66, 0.74, 0.78, 0.86, 0.92, 0.95 |
| Blur | `--blur-08 … --blur-40` | 8, 12, 16, 24, 32, 40 px |
| Radius | `--radius-xs/sm/md/lg/pill` | 4, 6, 12, 16, 999 px |
| Space | `--space-2xs … --space-3xl` | 2, 4, 8, 16, 24, 32, 48, 64 px |
| Type | `--display-xl…--label` | 72, 48, 36, 24, 18, 16, 14, 12, 11 px |
| Weights | `--weight-light/regular/medium` | 300 / 400 / 500 |
| Tracking | `--tracking-display/heading/caption/label` | −0.03em / −0.01em / 0.04em / 0.08em |
| Motion | `--ease-out`, `--ease-theme`, `--dur-fast/med/slow` | 150 / 240 / 320 ms, ease-out only |
| Layout | `--layout-sidenav-width/topbar-height/content-max` | 232 px / 56 px / 1200 px |
| Z | `--z-sidenav/topbar/dropdown/modal/palette` | 20 / 30 / 60 / 70 / 80 |
| Icon | `--icon-sm/md/lg` | 14 / 16 / 20 px |

### 3.2 Theme semantics

| Token | Dark (default) | Light |
|---|---|---|
| `--bg` | `#000000` OLED | `#f5f2ec` warm off-white |
| `--surface` / `--surface-raised` | `#111111` / `#1a1a1a` | `#ffffff` / `#efece5` |
| `--line` / `--line-visible` | `#222222` / `#333333` | `#e6e1d7` / `#cfc9bd` |
| `--control-line` | `#666666` | `#8a857c` |
| `--ink-strong` / `--ink` | `#ffffff` / `#e8e8e8` | `#000000` / `#1a1a1a` |
| `--ink-muted` / `--ink-faint` | `#999999` / `#666666` | `#635f58` / `#8a857c` |
| `--focus-ring` | `#ffffff` | `#1a1a1a` |
| `--scrim` | `rgb(0 0 0 / 0.62)` | `rgb(26 24 21 / 0.42)` |
| `--overlay-surface` (inputs, tooltips) | `rgb(17 17 17 / 0.82)` | `rgb(255 255 255 / 0.86)` |
| `--texture-ink` (dot texture) | `rgb(255 255 255 / 0.035)` | `rgb(26 24 21 / 0.05)` |

`--line` / `--line-visible` are decorative separators. Interactive boundaries
(inputs, technical buttons, checkbox) use `--control-line`, which clears the
3:1 non-text threshold (measured below). `--ink-faint` is non-text only
(borders, decoration); all readable text uses `--ink`, `--ink-muted`, or a
status ink.

### 3.3 Status palette — color is an event

Status colors encode data/status only (event, state, check, label, destructive
action). They never decorate. Values are per-theme so 11 px label text clears AA
on the worst surface of each theme.

| Token | Dark | Light | Context | Measured worst case (badge / plain raised) |
|---|---|---|---|---|
| `--status-ok` | `#5db26e` | `#2e6b3c` | success, clean, saved | 5.74 / 6.68 · 4.73 / 5.42 |
| `--status-warn` | `#d4a843` | `#7a5c0f` | pending, behind, draft | 6.61 / 7.86 · 4.64 / 5.29 |
| `--status-err` | `#ef6a72` | `#b3232a` | error, destructive, conflict | 5.08 / 5.78 · 4.77 / 5.58 |
| `--status-info` | `#6ea8f7` | `#0057c2` | links-as-info, interactive state | 6.09 / 7.13 · 4.88 / 5.66 |

¹ badge ink over `status-subtle` (10 % status over raised surface), worst pair
for each theme. Status text at 11 px (not large text) is held to 4.5:1 on the
plain raised surface (dark 5.78–7.86, light 5.29–5.66) and on the subtle badge
fill (4.64–6.61); the earlier samurai-derived 0.15 subtle alpha is rejected for
light text (4.18–4.43) and lowered to 0.10.

### 3.4 Glass token contract

Levels are semantic aliases; a fourth level would signal a design problem.

| Token family | thin | regular | thick |
|---|---|---|---|
| Blur | 12 px | 24 px | 32 px |
| Saturate (dark / light) | 150 % / 130 % | 170 % / 140 % | 185 % / 150 % |
| Brightness (dark / light) | 1.04 / 1 | 1.04 / 1 | 1.04 / 1 |
| Tint alpha (dark) | 0.55 | 0.66 | 0.78 |
| Tint alpha (light) | 0.62 | 0.74 | 0.86 |
| Edge (dark) | `white/0.10` | `white/0.14` | `white/0.18` |
| Edge (light) | `white/0.55` | `white/0.65` | `white/0.75` |
| Highlight | `white/0.16` dark, `white/0.8` light | shared | shared |
| Shadow (dark) | `0 1px 2px black/0.40` | `0 1px 2px black/0.45, 0 8px 28px black/0.50` | `0 2px 4px black/0.50, 0 24px 64px black/0.60` |
| Shadow (light) | `0 1px 2px #1a1815/0.10` | `…, 0 8px 28px #1a1815/0.14` | `…, 0 24px 64px #1a1815/0.22` |
| Radius | 12 px | 12 px | 16 px |
| Noise opacity | 0.02 | 0.03 | 0.04 |

The runtime channel is `--glass-*` custom properties; `--glass-{blur,tint,edge,
saturate,shadow,radius,noise-opacity}` are the per-element aliases, `--glass-app-*`
are the app-level aliases selected by `data-glass="thin|regular|thick"` (the
Settings control). Components never write `blur()` or alphas directly.

Five layers per surface: backdrop chain (blur + saturate + brightness), tint,
edge (1 px border + inset top highlight), depth (two-stop cast shadow), texture
(feTurbulence noise at 2–4 %, `mix-blend-mode: overlay`, `pointer-events: none`,
`z-index: -1` so grain never covers text).

### 3.5 Preference & fallback contract

| Query / attribute | Effect |
|---|---|
| base declaration | opaque-enough tint, readable without `backdrop-filter` |
| `@supports (backdrop-filter…)` | adds the blur chain progressively |
| `prefers-reduced-transparency: reduce` | tints → 0.95 alpha, blur off, noise off |
| `[data-transparency="reduce"]` (in-app setting) | same as above (covers WebKit/Tauri where the media query is missing) |
| `prefers-contrast: more` | solid `--surface`, `--control-line`→`--ink-faint` edges, blur and shadows off |
| `forced-colors: active` | `Canvas`/`CanvasText`/`ButtonText`, blur/shadows/noise off |
| `prefers-reduced-motion: reduce` | all durations → 0.01 ms |
| `@media print` | opaque white/black, blur off |

## 4. Typography rules

Families: Space Grotesk (UI/body), Space Mono (labels and data), Doto (hero
numerals only, ≥36 px). All fonts are self-hosted via `@fontsource` latin
subsets — no CDN, per the offline-app requirement.

| Role | Font | Size | Weight | Tracking |
|---|---|---|---|---|
| Hero numerals | Doto | 36–72 px (`--display-*`) | 500 | −0.03em |
| Page title | Space Grotesk | 24 px | 400 | −0.01em |
| Panel title | Space Grotesk | 16 px | 500 | −0.01em |
| Body | Space Grotesk | 16 px / 14 px | 300 / 400 | 0 |
| Data, paths, hashes, numbers | Space Mono | 14 px, tabular-nums | 400 | 0 |
| Labels, captions, status | Space Mono | 11 px, uppercase | 400 | 0.08em |

Per-view budget: at most **3 discretionary sizes** from the display/heading/body
tiers, plus the 11 px mono label tier that is part of the annotation grammar,
and at most **2 weights** (light/regular plus one of medium). Example — the repo
overview: Doto 36 (stats) + Grotesk 16 (panel titles) + Mono 14/11 (table and
labels) = within budget. Do not add a fourth size to a single view; split the
view instead.

## 5. xglass × samurai synthesis decisions

1. **Material from xglass, information from samurai.** The five-layer glass
   recipe is applied to exactly the surfaces that structure the shell: SideNav,
   TopBar, panels, dropdown, modal/sheet, command palette. Everything else is
   flat monochrome.
2. **Color is an event.** The whole chrome is ink/line on OLED black or warm
   off-white. Status hues appear only in `StatusLine`, `Badge`, check states and
   destructive actions. There is no brand accent, no gradient in chrome.
3. **Feedback is inline.** No toasts, no skeletons. `StatusLine` renders
   `[LOADING…]`, `[SAVED]`, `[ERROR: …]`; `LoadingText` is the minimal variant.
4. **Monochrome stroke icons.** lucide-react only, stroke width 1.5, sizes
   14/16/20; icons inherit `currentColor`.
5. **Motion is subtractive.** 150–240 ms ease-out on opacity/transform/color;
   `backdrop-filter` is never animated. Progress animations are transform-only.
6. **Glass budget.** Max 3 blurred surfaces per viewport (SideNav + TopBar +
   content = 3; overlays are exclusive and replace the count). Panels inside
   panels use `glass-flat` (translucent fill, no second blur) — no glass-on-glass.
7. **Radius grammar.** Cards/panels 12 px (thick 16 px max), buttons pill 999 px
   or technical 6 px, inputs 6 px.
8. **The tint does the contrast work.** Alphas are set from the measured
   worst-case numbers in §6, not from taste; blur is decoration.
9. **Native vs CSS glass (Tauri).** F3 ships CSS glass only; window-level
   vibrancy is an F5 packaging decision and must never be stacked with CSS blur
   on the same pixels. `data-runtime="tauri"` is set at boot for that phase.
10. **Hairlines are structural.** 1 px `--line`/`--line-visible` separators and
    a 2 px active-rail on nav/tabs carry hierarchy; no shadows on flat content.

## 6. Glass surface audit

Method: worst-case composite computed with `src/lib/contrast.ts`
(sRGB gamma-space alpha compositing, WCAG 2.x relative luminance), asserted in
`src/lib/contrast.test.ts`. Backdrop set per theme: canvas, surface, raised
surface, and a "busy mix" (25 % ink coverage averaged by blur — `[71,71,71]`
dark, `[190,190,190]` light). Full-white media walls are out of scope by
doctrine: the chrome renders no media; the only white pixels are sub-pixel text
strokes which the blur averages toward the busy mix. Text colors: dark
`#e8e8e8` (muted `#999`), light `#1a1a1a` (muted `#635f58`).

| Surface | Level | Contrast, worst case (dark / light) | Cost class | Fallback | Platform status |
|---|---|---|---|---|---|
| SideNav | thin | 11.87 / 13.94 (muted 5.11 / 5.09) | low (12 px, 232×100 vh) | opaque tint 0.95, `@supports` gate, reduced-transparency | not run — no browser in build container; F5 matrix Chromium/WebKitGTK/Firefox |
| TopBar | thin | 11.87 / 13.94 (muted 5.11 / 5.09) | low (12 px, full-width bar) | same as SideNav | same |
| Panel (cards, `data-glass` app level) | regular(24/0.66) / thin / thick | regular 12.83 / 15.00; thin 11.87 / 13.94; thick 13.76 / 16.10 (muted ≥ 5.09) | medium by default; user-selectable thin (low) or thick (high) | `@supports` gate; reduced-transparency and contrast-more collapse to solid `--surface` | same |
| Dropdown menu / popover | regular | 12.83 / 15.00 (muted 5.52 / 5.47) | medium (24 px, small area, transient) | opaque tint; closes on Escape/outside click | same |
| Modal | thick | 13.76 / 16.10 (muted 5.92 / 5.87); scrim first | high (32 px, exclusive) | scrim alone is readable without `::backdrop` blur (no blur used on the backdrop at all) | same |
| Sheet | thick | 13.76 / 16.10 | high (32 px, exclusive) | as Modal | same |
| Command palette (⌘K) | thick | 13.76 / 16.10 | high (32 px, exclusive; the one surface worth the budget) | as Modal | same |

Shared audit notes per xglass ref 04/05:

- Non-text: focus ring `#ffffff` on dark (21:1) and `#1a1a1a` on `#f5f2ec`
  (15.58:1); control borders 3.28–3.67 (asserted ≥3:1).
- Sticky surfaces reserve `--layout-topbar-height`/`--layout-sidenav-width`;
  focused elements are never obscured because content scrolls under a bar that
  only paints at the top and the outline offset is 2 px.
- Hit targets: icon buttons 32×32 (24×24 minimum honored at `sm`).
- Glass edges are decorative; functional boundaries always use `--control-line`
  or the focus ring.
- Tested fallback path: force-disable `backdrop-filter` in DevTools (F5 QA);
  base tints are already readable by construction.

## 7. Verification (F3)

- `npm run build` = `tsc` (strict, tests included) + `vite build`: clean.
- `npx vitest run`: 42 tests over theme resolution/persistence, bridge arg
  cleaning, mock command routing, device-flow lifecycle, mutation, time/count
  formatting, search/sort query building, and the contrast contract.
- `npm run dev` smoke: serves at `http://localhost:1420` (strictPort), mock
  mode active without Tauri.

Bundle (gzip): initial vendor+shell ≈ 137 kB — `react` family 98.79 kB, app
shell/runtime 4.65 kB, shared UI chunk 13.11 kB, React Query 10.20 kB, icons
3.49 kB, Tauri API wrapper 0.34 kB, CSS 12.76 kB; per-route chunks 0.2–2.2 kB;
font subsets 5–17 kB each. Markdown (`marked` + `DOMPurify`) is a lazy chunk
created only when a `Markdown` surface renders. The xglass budget for initial
JS (<100 kB gzip) is exceeded because React 19 + React Router 7 alone are
~99 kB gzip; app code is small. Accepted for F3, revisit in F5 (route-level
deferral of React Query and further chunk tuning).

## 8. Deviations and open items

1. **No browser verification in this container** (no Chromium/WebKit/Firefox
   available) — contrast is verified mathematically plus static review; the
   visual/per-engine matrix is scheduled for F5 (Tauri packaging).
2. **Initial JS budget overage** as above.
3. **HashRouter** instead of BrowserRouter — deliberate for Tauri custom
   protocol serving.
4. **`@fontsource/doto` exists** (5.3.0, static weights 100–900); latin
   `700.css` is used for hero numerals. No fallback needed.
5. Placeholder routed pages intentionally contain no feature UI; tabs expose
   only `EmptyState`/`SectionPlaceholder` except the repo overview, which
   demonstrates the typed bridge, React Query, table/data typography, and Doto
   hero numerals.
6. `--status-ok` light value `#2e6b3c` diverges from the samurai dark-first
   `#4a9e5c` because the shared value fails 4.5:1 for 11 px text on light
   surfaces; the samurai value remains the dark theme's conceptual ancestor.

## 9. F4 wave A — dashboard, search, profile, settings

Shipped surfaces and widgets (Home dashboard, global search, user profile,
settings, auth/onboarding, command-palette actions). No new blurred surface
was introduced; the persistent budget stays **SideNav (thin) + TopBar (thin) =
2**, overlays replace the count when open.

### 9.1 Materials

| Surface | Material | Why |
|---|---|---|
| Onboarding hero (`HomePage` signed out) | `Panel level="app"` | reuses the audited Panel surface; 3rd blurred surface max (SideNav + TopBar + panel) |
| Dashboard sections, repo/user cards, profile header, settings sections | `glass-flat` (translucent `--surface` 82%, hairline, no blur) | content inside the shell is flat per §5.1; grids of N cards would otherwise blow the blur budget |
| Clone / new-repo / lookup dialogs | `Modal` (thick, exclusive) | already audited overlay |
| Auth chip menu | `Dropdown` (regular) | already audited overlay |

`RepoCard`/`UserCard` accept `material: "flat" | "glass"`; `"glass"` renders
the audited `glass--regular` recipe for single-card placements. The default is
`"flat"` so result grids stay within the ≤3 blurred surfaces budget.

### 9.2 Flat-surface audit (`glass-flat`, dark/light)

Method: `color-mix(in oklab, var(--surface) 82%, transparent)` composited with
`sRGB` alpha over the four audited backdrops (canvas, surface, raised, busy
mix); same `contrast.ts` contract as §6. Asserted in
`src/lib/contrast.test.ts`.

| Text | Worst case dark | Worst case light | Threshold |
|---|---|---|---|
| Body ink (`--ink` #e8e8e8 / #1a1a1a) | 14.06 | 15.68 | ≥ 4.5 |
| Muted ink (`--ink-muted` #999 / #635f58) | 6.05 | 5.72 | ≥ 4.5 |
| Hairline (`--line` #222 / #e6e1d7) | decorative separator, not a functional boundary | — | — |
| Interactive boundary (cards, inputs) | `--control-line` 3.28–3.67 | same as §6 | ≥ 3 |

Fallbacks are inherited from `glass.css`: reduced transparency, `prefers-
contrast: more`, `forced-colors`, and print all collapse `.glass-flat` to a
solid `--surface`. Cost class: low (no backdrop pass). Platform status: not
run in this container (same as §6.1; F5 matrix).

### 9.3 Typography and color in wave A

- Hero numerals: `StatTile` uses Doto 36 (`t-display-md`); per view: Doto 36 +
  Grotesk 24/16 + Mono 14/11.
- Color is an event: language dots use `--status-warn` (Rust), `--status-info`
  (TypeScript, Python), `--status-ok` (JSONC) as data encoding; stars/forks,
  relative times, and all chrome stay monochrome. Follow/unfollow is out of
  scope; destructive sign-out uses `--status-err` via `Button danger`.
- Feedback is inline: every query renders `[LOADING…]`/`[ERROR: …]` +
  `Retry`; mutations render `[SAVED: …]`. No toasts, no skeletons.
- Markdown (`src/ui/Markdown.tsx`) sanitizes with DOMPurify (`USE_PROFILES`
  html, `FORBID_TAGS` media/form/style, `ALLOW_DATA_ATTR: false`, links forced
  to `rel="noopener noreferrer"`), escapes raw HTML blocks in `marked`, and
  routes links through `openExternal`; `marked`/`DOMPurify` are lazy-loaded.

## 10. F4 wave B — repository explorer and local panel

No new blurred surfaces were introduced. The persistent budget stays
**SideNav (thin) + TopBar (thin) = 2**; overlays (Modal, Dropdown) remain
exclusive and reuse the §6 audit lines. The repo header, tabs, file tree,
lists, diff viewer and code viewer are `glass-flat`; the code and diff panes
are flat `color-mix` fills of `--surface` (70–82 %), the same contract audited
in §9.2 (body ink ≥ 14.06 / 15.68, muted ink ≥ 6.05 / 5.72 worst case).

Color stays an event and encodes data only: diff additions/deletions
(`--status-ok` / `--status-err` on line signs and counters), issue/PR/check
state (`StatusDot`), file-change kinds, and highlight.js token classes inside
`CodeView` (comments muted-italic, keywords ink-strong, strings/numbers/titles
one status hue each; surrounding code text stays `--ink`). Typography per view:
Doto 36 (repo stat tiles), Grotesk 24/16, Mono 14/11/12 — within the §4 budget.


