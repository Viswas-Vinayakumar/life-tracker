// User-verified nutrition — the app's own ground-truth learning.
// When the user confirms an entry's values are accurate, we store the exact
// macros keyed by the (normalized) food input. parseFood() checks this store
// FIRST, so a confirmed food is reused verbatim forever — no DB guess, no AI.
// Over time this set grows into a personal, trusted nutrition database.
import type { FoodNutrition } from './ollama'

const KEY = 'lifeos_verified_nutrition_v1'
const MAX_ENTRIES = 500

export interface VerifiedRecord extends FoodNutrition {
  verifiedAt: string
}

type Store = Record<string, VerifiedRecord>

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

export function getVerifiedNutrition(input: string): FoodNutrition | null {
  const rec = read()[normalize(input)]
  if (!rec) return null
  const { verifiedAt: _verifiedAt, ...nutrition } = rec
  return nutrition
}

export function isVerified(input: string): boolean {
  return normalize(input) in read()
}

export function setVerifiedNutrition(input: string, n: FoodNutrition): void {
  const store = read()
  store[normalize(input)] = { ...n, verifiedAt: new Date().toISOString() }
  // Cap the store: drop the oldest key if we exceed the limit.
  const keys = Object.keys(store)
  if (keys.length > MAX_ENTRIES) delete store[keys[0]]
  write(store)
}

export function removeVerifiedNutrition(input: string): void {
  const store = read()
  delete store[normalize(input)]
  write(store)
}

export function verifiedCount(): number {
  return Object.keys(read()).length
}
