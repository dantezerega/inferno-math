# Inferno — Mental Math Trainer

A fast, keyboard-first mental-arithmetic trainer inspired by Zetamac, built with
a modern, original, flame-themed UI. Solve as many problems as you can before
the timer runs out, track your progress, and build a daily practice habit.

## Features

- **Timed sessions** — 30s / 60s / 120s / 300s presets or a custom duration, with
  a smooth rAF-driven countdown that can't drift.
- **Problem types** — addition, subtraction, multiplication, division (always
  integer answers), and mixed mode.
- **Difficulty** — six tiers of escalating challenge: Easy (1–10), Medium
  (10–100), Hard (100–1000), Expert (1k–10k), Master (multi-step, 2–3 ops), and
  Grandmaster (multi-step, 3–5 ops, occasional parentheses). Multi-step problems
  follow standard order of operations and always resolve to a non-negative
  integer. Optional **Auto Difficulty** raises the level after >90% accuracy and
  lowers it below 60%.
- **Daily challenge** — same seeded problem set for everyone each day, with a
  separate personal best.
- **Statistics** — totals, averages, accuracy, practice time, personal records,
  a 14-day score trend (Recharts), and a GitHub-style practice heatmap.
- **Sound** — synthesized correct / incorrect / complete cues (no assets) with a
  toggle and volume control.
- **Theming** — light / dark / system with smooth transitions, no flash on load.
- **Persistence** — settings and statistics saved to `localStorage`.

## Stack

React · Vite · TypeScript (strict) · Tailwind CSS · Zustand · Framer Motion ·
React Router · Recharts · Vitest.

## Getting started

```bash
npm install
npm run dev
```

Then open the printed local URL.

## Scripts

| Command                 | Description                          |
| ----------------------- | ------------------------------------ |
| `npm run dev`           | Start the dev server                 |
| `npm run build`         | Type-check and build for production  |
| `npm run preview`       | Preview the production build         |
| `npm test`              | Run the Vitest suite                 |
| `npm run test:coverage` | Run tests with a coverage report     |
| `npm run lint`          | Type-check without emitting          |

## Architecture

```
src/
  components/   reusable UI (Button, Card, Heatmap, ThemeToggle, …)
  pages/        Home, Settings, Game, Results, Statistics
  game/         problem generation, scoring, daily challenge (pure logic)
  stats/        statistics aggregation + heatmap helpers (pure logic)
  store/        Zustand stores (game, settings, stats)
  hooks/        useTheme, useCountdown
  utils/        rng, date, sound, classnames
  types/        shared TypeScript types
  tests/        Vitest unit + hook tests
```

Game/stats/util logic is kept free of React so it's directly unit-testable; the
stores wire that logic into persisted state, and components stay presentational.

## How it plays

Press **Start**, then just type — the answer input stays focused the whole time.
**Enter** submits. Correct answers score a point, grow your streak, and load the
next problem instantly; wrong answers reset the streak and keep the problem up
until you solve it.
# inferno-math
