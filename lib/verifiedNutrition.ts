// User-rated nutrition — the app's own ground-truth learning.
// The user rates each logged food's accuracy 1–5 and can correct the macros
// (e.g. from real values online). parseFood() trusts a record when the user
// corrected it or rated it highly, and reuses those values verbatim forever.
// Over time this becomes a personal, trusted nutrition database the model
// learns from.
import type { FoodNutrition } from './ollama'

const KEY = 'lifeos_verified_nutrition_v1'
const MAX_ENTRIES = 500

export interface LearnedFood extends FoodNutrition {
  rating: number          // 1–5 accuracy rating
  corrected: boolean      // user edited the macro values
  ratedAt: string
}

type Store = Record<string, LearnedFood>

// Normalize so "Vollkornbrot ×2  und Omelett" and "vollkornbrot ×2 und omelett"
// resolve to the same key.
function normalize(input: string): string {
  return input.toLowerCase().trim().replace(/\s+/g, ' ')
}

function read(): Store {
  if (typeof window === 'undefined') return {}
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') } catch { return {} }
}

function write(store: Store): void {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(KEY, JSON.stringify(store)) } catch { /* ignore quota */ }
}

// We trust a record (reuse its values in parseFood) when the user corrected the
// numbers, or rated the auto-estimate as accurate (4–5 stars).
function isTrusted(rec: LearnedFood): boolean {
  return rec.corrected || rec.rating >= 4
}

export function getVerifiedNutrition(input: string): FoodNutrition | null {
  const rec = read()[normalize(input)]
  if (!rec || !isTrusted(rec)) return null
  const { rating: _r, corrected: _c, ratedAt: _t, ...nutrition } = rec
  return nutrition
}

export function getRating(input: string): LearnedFood | null {
  return read()[normalize(input)] ?? null
}

export function rateNutrition(input: string, n: FoodNutrition, rating: number, corrected: boolean): void {
  const store = read()
  store[normalize(input)] = {
    ...n,
    rating: Math.max(1, Math.min(5, Math.round(rating))),
    corrected,
    ratedAt: new Date().toISOString(),
  }
  const keys = Object.keys(store)
  if (keys.length > MAX_ENTRIES) delete store[keys[0]]
  write(store)
}

export function removeRating(input: string): void {
  const store = read()
  delete store[normalize(input)]
  write(store)
}

// ─── For the Learning section ─────────────────────────────────────
export function getLearnedFoods(): LearnedFood[] {
  return Object.values(read()).sort((a, b) => b.ratedAt.localeCompare(a.ratedAt))
}

export interface LearningStats {
  total: number
  trusted: number
  corrected: number
  avgRating: number
}

export function learningStats(): LearningStats {
  const all = Object.values(read())
  const total = all.length
  const trusted = all.filter(isTrusted).length
  const corrected = all.filter(r => r.corrected).length
  const avgRating = total ? all.reduce((s, r) => s + r.rating, 0) / total : 0
  return { total, trusted, corrected, avgRating: Math.round(avgRating * 10) / 10 }
}
