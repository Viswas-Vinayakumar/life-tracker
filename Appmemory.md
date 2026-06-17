# Life OS — App Memory

> Persistent working memory for this project. **Read this first** at the start of any session, and **update it** whenever you make changes, fix bugs, change designs, have ideas, or hit something non-obvious. Keep the Change Log at the bottom current.
>
> Last updated: **2026-06-17**

---

## 1. What this app is

**Life OS** — a private, single-user "intelligent daily life tracker" desktop app. It tracks nutrition, gym workouts, habits, tasks, finances, sleep/mood/water vitals, and produces an overall daily performance score. A **local LLM (Ollama)** acts as a brutally-honest personal coach across food, gym, and whole-of-life domains. The owner/user is **Viswas** (viswasvinayakumar@gmail.com), based in **Germany (Berlin)**; the physique goal baked into the AI prompts is **~10% body fat + lean muscle**.

- Product name: **Life OS** (window title, sidebar, Tauri `productName`)
- Bundle id: `com.viswas.lifeos`, version `1.0.0`
- Single-user, no auth/login. Data is the user's own.

---

## 2. Tech stack

| Layer | Choice |
|---|---|
| Framework | **Next.js 16.2.9**, App Router, React 19.2 |
| ⚠️ Next.js note | This is a **modified Next.js with breaking changes** — per `AGENTS.md`, **read `node_modules/next/dist/docs/` before writing Next code**; do not assume training-data APIs. |
| Desktop shell | **Tauri 2** (Rust) → macOS `.app` + `.dmg`. `src-tauri/` |
| Styling | **Tailwind CSS v4** + heavy CSS custom properties (design tokens) in `app/globals.css` |
| UI primitives | shadcn-style components in `components/ui/` (Radix/base-ui under the hood), `lucide-react` icons, `framer-motion`, `sonner` toasts, `recharts` |
| Cloud data | **Supabase** (postgres) via `@supabase/supabase-js` |
| Offline cache | **IndexedDB** via `idb` — `lib/offline.ts`, DB `life-os-v1` v4 |
| Local AI | **Ollama** at `http://127.0.0.1:11434` — `lib/ollama.ts` |
| Food fallback API | **CalorieNinjas** (only if local DB + Ollama both miss) |
| Notifications | `@tauri-apps/plugin-notification` |

### Build / run
- `npm run dev` — Next dev server on :3000 (web mode).
- `npm run tauri:dev` — Tauri window pointed at the dev server (`devUrl`). **Use this to see changes live in the desktop app.**
- `npm run tauri:build` — production build: runs `npm run export` (`TAURI_BUILD=1 next build`, static export to `out/`), then bundles the `.app`/`.dmg`. Output: `src-tauri/target/release/bundle/macos/Life OS.app`.
- `npm test` — runs `lib/__tests__/nutritionLookup.test.ts` via `node --experimental-strip-types`.
- `next.config.ts`: static `output: 'export'` + `images.unoptimized` + `trailingSlash` only when `TAURI_BUILD=1`; web build stays normal.

### Environment (`.env.local`)
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `CALORIE_NINJAS_API_KEY`, `NEXT_PUBLIC_CALORIE_NINJAS_API_KEY`. (Local-only secrets — never commit.)

---

## 3. ⚠️ KNOWN ISSUE — "the app undid my changes" (stale Tauri build)

**Symptom (2026-06-17):** Running app shows the OLD "L" logo, v1.0, old Food page — looks like recent commits were reverted.

**Root cause:** The code is NOT reverted. Git `HEAD` (`42ae562`) has all the latest work (new squircle logo, new icons, nutrition overhaul). The problem is the user is running a **stale compiled binary**:
- `/Applications/Life OS.app` and `src-tauri/target/release/bundle/macos/Life OS.app` were built **14 Jun**.
- The static export in `out/` and `.next/` is also from **14 Jun 10:59**.
- The new logo/icon commits landed **15 Jun**. So the installed app predates them.

**Fix:** Rebuild and reinstall.
```bash
npm run tauri:build           # regenerates out/ + the .app/.dmg
# then drag the freshly built app from
# src-tauri/target/release/bundle/macos/Life OS.app  →  /Applications
```
For day-to-day work use `npm run tauri:dev` (live reload) so this never happens.

**Lesson for future:** When the user reports "changes reverted / old design", first check whether they're running a **stale build** (`ps aux | grep "Life OS"` + compare `out/` mtime vs latest commit date) BEFORE touching code. The code is usually fine.

---

## 4. Architecture & data flow

### Offline-first pattern (`lib/db.ts`)
Every read/write hits **IndexedDB first (instant)**, then tries Supabase; on network failure it silently falls back to local. Writes go to IndexedDB immediately, then upsert to Supabase. Temp UUIDs are swapped for server rows on success. This means the app fully works offline.

- `lib/supabase.ts` — thin client from env vars.
- `lib/offline.ts` — IndexedDB `life-os-v1`, **version 4**. Stores: `daily_logs` (key `date`), `food_entries` (`id`), `financial_entries` (`id`), `todos` (`id`), `activity_log` (`id`), `workout_logs` (key `date`). **Bump `DB_VERSION` + add an `upgrade` branch when adding a store.**
- `lib/db.ts` — all CRUD: logs, food, finance, todos, workouts. Workouts stored offline-only via `workout_logs` (no Supabase table wired in `db.ts` for workouts — verify before assuming cloud sync).
- `lib/activityLog.ts` — append-only audit feed (the "Log" tab). Types: `habit|food|todo|finance|vitals|journal|history_edit`; actions: `toggled_on/off|added|completed|deleted|updated|edited|moved`.

### Supabase tables (inferred from queries)
`daily_logs` (onConflict `date`), `food_entries`, `financial_entries`, `todos`. Workouts + activity log appear IndexedDB-only.

### Types (`types/index.ts`)
`DailyLog` (gym/study/skincare booleans, water, sleep, mood, energy, weight, steps, hr, journal, `performance_score`), `FoodEntry` (raw_input, food_name, calories, protein, carbs, fat, fiber, sugar, sodium_mg, meal_type), `FinancialEntry`, `Todo` (priority, list today|backlog, status, due_date), `WorkoutSession`/`WorkoutExercise`/`WorkoutSet`. Constants: `EXPENSE_CATEGORIES`, `INCOME_CATEGORIES`, `NUTRITION_GOALS` (cal 2200, protein 150, carbs 250, fat 70, fiber 30, water 8, sleep 8).

---

## 5. Pages (App Router, `app/`)

| Route | File | Purpose |
|---|---|---|
| `/` | `page.tsx` | redirect/entry → Today |
| `/today` | `today/page.tsx` | Daily habits, vitals, score ring, AI life summary, motivational quotes (right panel) |
| `/food` | `food/page.tsx` | Nutrition logger, calories/macros dashboard, Nutrition AI coach card |
| `/gym` | `gym/page.tsx` | Workout tracker, AI gym coach (AI-only panel) |
| `/tasks` | `tasks/page.tsx` | Todos: today/backlog, priority, deadlines, complete/edit |
| `/finance` | `finance/page.tsx` | Income/expense, categories |
| `/dashboard` | `dashboard/page.tsx` | **"Stats"** in nav — charts, comprehensive AI analysis |
| `/history` | `history/page.tsx` | Date-picker to view/edit past days |
| `/activity` | `activity/page.tsx` | **"Log"** in nav — append-only activity feed |

**Navigation** (`components/layout/Sidebar.tsx`): Today, Food, Gym, Tasks, Finance, Stats(→/dashboard), History, Log(→/activity). Mobile uses `BottomNav.tsx`. Layout = sidebar + scrollable main on desktop (`md:`), bottom nav on mobile. Traffic-light spacer (52px) + `data-tauri-drag-region` for the frameless Tauri window (`titleBarStyle: Overlay`, hidden title).

---

## 6. Components map

- `layout/` — `Sidebar`, `BottomNav`, `Logo` (inline SVG), `ThemeToggle`, `TitleBar`.
- `food/FoodLogger.tsx` — meal-type select + free-text input → `parseFood`.
- `finance/FinanceWidget.tsx`.
- `habits/HabitToggle.tsx`, `habits/ScoreRing.tsx` (animated score circle).
- `profile/ProfileModal.tsx` (+ `ProfileButton`) — edits `UserProfile`.
- `notifications/NotificationScheduler.tsx`.
- `ui/` — shadcn-style: button, card, dialog, select, tabs, sheet, input, textarea, badge, progress, avatar, separator, scroll-area, sonner, `ConfirmDialog`.

---

## 7. The AI layer (`lib/ollama.ts`) — the app's brain

Talks to local **Ollama** (`127.0.0.1:11434`). Picks the best small model available, preferring `llama3.2:3b` (3B is enough for JSON extraction); falls back through gemma3/phi/mistral. Two option presets: `FAST_OPTIONS` (temp 0.05, for parsing) and `ANALYSIS_OPTIONS` (temp 0.2, for coaching). All prompts force `format: 'json'`.

**Self-learning memory** — `localStorage` key `lifeos_ai_memory` (`AIMemory`: patterns/foodHabits/wins/concerns, capped ~12 each). Coaching calls append learned facts and re-inject them into future prompts ("WHAT I KNOW ABOUT THIS USER"). This is the app's own persistent user-model, separate from this `Appmemory.md`.

**Key functions:**
- `parseFood(input)` — resolution order: (1) local DB `parseNutritionLocally` (instant), (2) `localStorage` nutrition cache `lifeos_nutrition_cache_v1` (≤200 entries), (3) Ollama `parseFoodWithOllama`, (4) partial local match, (5) CalorieNinjas API. Throws `parse_failed` (AI tried, failed) vs `no_ai` (Ollama not running). `reconcileMacros()` enforces Atwater 4/4/9 — if stated calories deviate >20% from macro-derived, trust the macros.
- `getFoodSummary(entries)` → Nutrition AI card (headline, rating excellent|good|fair|poor, insight, tip, highlight). Brutally-honest physique-coach persona; hard limits protein≥weight×2, sugar<25g, sodium<2000mg, cal~TDEE.
- `getLifeSummary(logs, food, workouts, todoStats)` → cross-domain "life OS coach" on Today/Stats.
- `getGymCoaching(session, history)` → progressive-overload gym coach (uses `lib/gymKnowledge.ts`).

**Nutrition knowledge bases:**
- `lib/nutritionLookup.ts` (~824 lines) — large local per-100g food DB, `lookupFood`, `parseNutritionLocally` (handles quantities, composite dishes). The **deterministic accuracy path** (commit `42ae562` computes composite dishes deterministically).
- `lib/germanFoods.ts` — German-specific foods (Magerquark, Vollkornbrot, etc.) + AI context. Reflects the user being in Germany.
- `lib/gymKnowledge.ts` — `MUSCLE_GROUPS`, `detectMuscleGroup`, exercise suggestions, AI context.
- `lib/profile.ts` — `UserProfile` (age, height, weight, goal, activity, dietary prefs, city/country, bodyFatPct 13→target 10, gymTargetDays 4, physiqueGoal lean_muscle). `calcBMI`, `calcTDEE` (Mifflin-St Jeor ×1.55), `buildProfileContext` feeds every AI prompt. Stored in localStorage.

---

## 8. Scoring (`lib/scoring.ts`)

Daily `performance_score` 0–100 = **Body 40 + Mind 40 + Life Systems 20**:
- Body: gym +20; water ≥8 +10 / ≥4 +5; sleep 7–9h +10 (graded down otherwise).
- Mind: study +20; skincare AM +10; skincare PM +10.
- Life: any food logged +10; mood +5; energy +5.
- Bands (`getScoreColor`/`getScoreLabel`): ≥90 Peak 🔥 gold · ≥75 Strong green · ≥60 Solid cyan · ≥40 Off-day amber · >0 Reset red.

---

## 9. Design system (`app/globals.css`)

Apple-HIG-inspired. CSS variables on `:root` (light) and `.dark`. Dark is default (inline script in `layout.tsx` sets `.dark` from localStorage `theme` or system pref pre-paint to avoid flash).
- Colors: `--bg` #FFF/#000, surfaces, `--accent` #007AFF, semantic success/warning/error, violet/cyan/indigo accents (each with a translucent `-2` variant).
- Sidebar: `--sidebar-w: 216px`, translucent bg.
- Radii `--r-sm`6 / `--r`10 / `--r-lg`14 / `--r-xl`18. Shadows sm/md/lg.
- shadcn aliases mapped to these tokens (`--card`, `--primary`, `--radius`, etc.).

### Logo & icon (current, post-15-Jun)
`components/layout/Logo.tsx` = inline SVG: **light squircle card** (white→#ececed gradient, rx 8.5) with **dark chevrons + solid arrowhead** (gradient #454b59→#14171e) — meant to match the app icon. App icons live in `src-tauri/icons/` (regenerated 15 Jun, larger files). Source art: `app-icon.png` + `Gemini_Generated_Image_*.png` (untracked) at repo root.

---

## 10. Conventions & gotchas

- **Read `node_modules/next/dist/docs/` before writing Next.js** — this Next is modified (AGENTS.md / CLAUDE.md).
- Offline-first: never assume a write reached Supabase; UI should reflect the local write immediately.
- Adding an IndexedDB store ⇒ bump `DB_VERSION` and add an `upgrade` branch.
- AI is **best-effort**: every Ollama function returns `null` if Ollama isn't running — UI must degrade gracefully ("Ollama AI" badge on Food page reflects availability).
- Currency/locale: German context (EUR, German foods, Berlin).
- Tests: only `nutritionLookup` is covered. Add cases there when extending the food DB.
- After UI changes, **rebuild the Tauri app** or the user sees stale binaries (see §3).

---

## 11. Git state (as of 2026-06-17)

- Branch: `feat/nutrition-ui-overhaul` (tracks `origin/`). Main: `main`.
- Latest commits: `42ae562` deterministic composite dishes · `e19bc98` nutrition accuracy overhaul + new icon + dashboard polish · `57ac5fc` new app icon + AI speed/brutality · `cd1324b` gym AI-only + quotes + Stats AI · `800a25a` gym timer removed, new logo, CRUD icons, habit/task logging.
- Untracked at root: `Gemini_Generated_Image_39egmr39egmr39eg.png` (logo source art, ~5.5 MB — decide whether to keep/gitignore).
- `feat/nutrition-ui-overhaul` vs `main`: mostly regenerated `src-tauri/icons/*` + `tsconfig.json`.

---

## 12. Roadmap / ideas / open threads

- [x] ~~**Immediate:** rebuild Tauri app so the new logo/icon/nutrition work actually shows (see §3).~~ Done 2026-06-17.
- [ ] "There are so much more updates to be made" (user, 2026-06-17) — UI overhaul continues. Capture specifics here as they're decided.
- [ ] Decide: commit or gitignore the `Gemini_Generated_Image_*.png` source art.
- [ ] Consider wiring workouts + activity_log to Supabase (currently IndexedDB-only).

---

## 13. Change Log

| Date | Change |
|---|---|
| 2026-06-17 | **Accuracy-confirm control + self-learning (Food page).** Added a tiny ✓ (`CheckCircle2`) toggle next to each entry's trash button — styled to match (30×30, success green when active), so it doesn't disturb the theme. New `lib/verifiedNutrition.ts` stores user-confirmed macros keyed by normalized food input in `localStorage` (`lifeos_verified_nutrition_v1`, cap 500). `parseFood` now checks this **store FIRST (step 0)** before local DB/cache/AI — so a confirmed food is reused verbatim forever. Confirming also calls `noteVerifiedFood()` → feeds the coaching AI's `lifeos_ai_memory` (foodHabit), and logs an activity. Toggle off removes the verification. This is the app learning the user's foods over time. `app/food/page.tsx`: `verified` state hydrated from store on load, `toggleVerified` handler. **DMG bundling failed during build (hdiutil flake) — non-blocking; the `.app` built + installed fine.** |
| 2026-06-17 | Created `Appmemory.md`. Diagnosed the "reverted changes" report as a **stale 14-Jun Tauri build** (code is current at `42ae562`); fix = rebuild/reinstall or use `tauri:dev`. Documented full architecture, AI layer, scoring, design system. |
| 2026-06-17 | **Nutrition accuracy fix (German connectors + omelette).** "Vollkornbrot ×2 und Omelett" was hitting Ollama (which guessed 542 kcal / 34g protein, ~50% too high) because the deterministic parser couldn't handle it. Three fixes in `lib/nutritionLookup.ts`: (1) `parseNutritionLocally` now splits items on **German/symbol connectors** `und`/`mit`/`with`/`plus`/`+`/`&`, not just `,`/` and ` — critical for this German-focused app; (2) added an **Omelette** entry to `FOODS` (per100g P11/F13/165kcal, servingG 120 ≈ 2-egg); (3) tuned **Whole Wheat Bread / Vollkornbrot** to German reality (P9/100g, servingG 45 vs old P13/30g) + more aliases. Now deterministic: ~21g protein / ~400 kcal, skips the AI. Added 3 regression tests (29 total, all pass). **Note:** entries logged BEFORE this fix keep their old AI values in IndexedDB/Supabase — delete + re-add to recompute. Local DB is checked before the localStorage nutrition cache, so new logs are correct. |
| 2026-06-17 | **Fixed duplicate Life OS apps + new icon.** Ran `npm run tauri:build` (new 453KB `icon.icns`), deleted old `/Applications/Life OS.app` (14-Jun, 196KB icon), installed fresh build to `/Applications`. Cleared icon cache + reset Launchpad (`lsregister -f`, killall Dock). The 2nd Launchpad tile was the dev **build-bundle copy** at `src-tauri/target/release/bundle/macos/Life OS.app` — `lsregister -u`'d it (left on disk; builds need it). Result: one app in `/Applications` with the new icon. **Note:** that build-bundle re-registers each `tauri:build`; unregister again if the duplicate tile returns. |

<!-- APPEND new entries above this line. One row per meaningful change/bug/design decision. -->
