// Client-side Supabase access — works in both web and Tauri
import { supabase } from './supabase'
import type { DailyLog, FoodEntry, FinancialEntry } from '@/types'

// ─── Daily Logs ───────────────────────────────────────────────────────────────

export async function getLog(date: string): Promise<DailyLog | null> {
  const { data } = await supabase
    .from('daily_logs').select('*').eq('date', date).maybeSingle()
  return data
}

export async function getLogs(days: number): Promise<DailyLog[]> {
  const { data } = await supabase
    .from('daily_logs').select('*')
    .order('date', { ascending: false }).limit(days)
  return data ?? []
}

export async function upsertLog(log: Partial<DailyLog>): Promise<DailyLog | null> {
  const { data } = await supabase
    .from('daily_logs').upsert(log, { onConflict: 'date' }).select().maybeSingle()
  return data
}

// ─── Food ─────────────────────────────────────────────────────────────────────

export async function getFoodEntries(date: string): Promise<FoodEntry[]> {
  const { data } = await supabase
    .from('food_entries').select('*').eq('date', date)
    .order('created_at', { ascending: true })
  return data ?? []
}

export async function addFoodEntry(entry: Omit<FoodEntry, 'id' | 'created_at'>): Promise<FoodEntry | null> {
  const { data } = await supabase.from('food_entries').insert(entry).select().maybeSingle()
  return data
}

export async function deleteFoodEntry(id: string): Promise<void> {
  await supabase.from('food_entries').delete().eq('id', id)
}

// ─── Finance ──────────────────────────────────────────────────────────────────

export async function getFinanceEntries(month: string): Promise<FinancialEntry[]> {
  const { data } = await supabase
    .from('financial_entries').select('*')
    .gte('date', `${month}-01`).lte('date', `${month}-31`)
    .order('date', { ascending: false })
  return data ?? []
}

export async function addFinanceEntry(entry: Omit<FinancialEntry, 'id' | 'created_at'>): Promise<FinancialEntry | null> {
  const { data } = await supabase.from('financial_entries').insert(entry).select().maybeSingle()
  return data
}

export async function deleteFinanceEntry(id: string): Promise<void> {
  await supabase.from('financial_entries').delete().eq('id', id)
}

// ─── Nutrition parsing ────────────────────────────────────────────────────────

export async function parseFood(input: string) {
  const key = process.env.NEXT_PUBLIC_CALORIE_NINJAS_API_KEY
  if (!key) throw new Error('NEXT_PUBLIC_CALORIE_NINJAS_API_KEY not set')

  const res = await fetch(
    `https://api.calorieninjas.com/v1/nutrition?query=${encodeURIComponent(input)}`,
    { headers: { 'X-Api-Key': key } }
  )
  if (!res.ok) throw new Error(`API error ${res.status}`)
  const data = await res.json()
  const items = data.items ?? []
  if (!items.length) throw new Error('Food not found')

  const totals = items.reduce(
    (acc: { calories: number; protein: number; carbs: number; fat: number; fiber: number; sugar: number; sodium_mg: number }, item: {
      calories: number; protein_g: number; carbohydrates_total_g: number;
      fat_total_g: number; fiber_g: number; sugar_g: number; sodium_mg: number; name: string
    }) => ({
      calories: acc.calories + item.calories,
      protein: acc.protein + item.protein_g,
      carbs: acc.carbs + item.carbohydrates_total_g,
      fat: acc.fat + item.fat_total_g,
      fiber: acc.fiber + item.fiber_g,
      sugar: acc.sugar + item.sugar_g,
      sodium_mg: acc.sodium_mg + item.sodium_mg,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium_mg: 0 }
  )

  return {
    food_name: items.map((i: { name: string }) => i.name).join(', '),
    calories: Math.round(totals.calories),
    protein: Math.round(totals.protein * 10) / 10,
    carbs: Math.round(totals.carbs * 10) / 10,
    fat: Math.round(totals.fat * 10) / 10,
    fiber: Math.round(totals.fiber * 10) / 10,
    sugar: Math.round(totals.sugar * 10) / 10,
    sodium_mg: Math.round(totals.sodium_mg),
  }
}
