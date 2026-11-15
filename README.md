# 🍳 Hearth — Cooking, Recipe & Ingredient Manager

A fully open-source (React + Vite) kitchen app. No backend, no API keys — all
data lives in your browser via `localStorage`. Ships with sample data you can
edit or reset.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build
```

## Features

| Area | What it does |
|------|--------------|
| **Dashboard** | Recipes made, grocery spend, avg cost/meal, and a full nutrient breakdown per **day / week / month / year**, plus cooked-per-month and spend-per-month charts and a macro pie. |
| **Recipes** | Filter by multiple types/tags (vegan, indian, gluten-free, dairy…), sort by price/serving, calories, rating or name. Per-recipe cost, scalable servings, cook logging. |
| **Recipe import** | Paste a recipe URL (reads open **schema.org/Recipe** JSON-LD via a public CORS proxy) or paste the JSON/HTML directly. Ingredient lines are parsed and matched to your ingredient library. |
| **Ingredients & prices** | Every ingredient retains a **price history**; the detail page charts **price-per-unit over time**. Tracks how much of each ingredient you've actually cooked. |
| **Nutrition** | Per-ingredient nutrition (per 100 base units) → per-recipe and per-serving totals. Macros (protein/carbs/fat/**fiber**/sugar), **vitamins** (A/C/D) and minerals, with % daily values. |
| **Pantry** | What's on hand, by category. Logging a cook auto-deducts ingredients. |
| **What can I make?** | Recommends recipes by how well your pantry covers them; one-click adds missing items to the shopping list. |
| **Shopping list** | Auto-estimates cost from price history; "move checked to pantry" restocks. |
| **Meal planner** | Weekly calendar; generate a shopping list for the whole week. |
| **Sourdough** | Separate starter feeding log with hydration & ratio, feeding streak, "feed today" reminder, discard tracking, and a hydration/temperature trend chart. |

## Tech

React 18, React Router, Zustand (persisted to localStorage), Recharts, date-fns,
Vite. All MIT/ISC-licensed open source.

## Data model

- **Ingredients** store nutrition per 100 base units (g / ml / each) and a price
  history (price per base unit). Units convert through a shared base.
- **Recipes** reference ingredients with quantity + unit; cost and nutrition are
  derived, never stored stale.
- **Cook log** records what you made (drives the dashboard + pantry deductions).
- **Purchases** drive both price history and grocery-spend analytics.

Use **Reset data** on the dashboard to restore the sample set.
