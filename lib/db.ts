import { supabase } from './supabase'
import { offlineGet, offlineGetAll, offlinePut, offlinePutAll, offlineDelete } from './offline'
import type { DailyLog, FoodEntry, FinancialEntry, Todo } from '@/types'

// ─── Daily Logs ────────────────────────────────────────────────

export async function getLog(date: string): Promise<DailyLog | null> {
  try {
    const { data } = await supabase.from('daily_logs').select('*').eq('date', date).maybeSingle()
    if (data) { offlinePut('daily_logs', data as Record<string, unknown>); return data }
  } catch { /* fall through */ }
  return (await offlineGet<DailyLog>('daily_logs', date)) ?? null
}

export async function getLogs(days: number): Promise<DailyLog[]> {
  try {
    const { data } = await supabase.from('daily_logs').select('*').order('date', { ascending: false }).limit(days)
    if (data?.length) { offlinePutAll('daily_logs', data as Record<string, unknown>[]); return data }
  } catch { /* fall through */ }
  const all = await offlineGetAll<DailyLog>('daily_logs')
  return all.sort((a, b) => b.date.localeCompare(a.date)).slice(0, days)
}

export async function upsertLog(log: Partial<DailyLog>): Promise<DailyLog | null> {
  // Write to offline first (instant)
  offlinePut('daily_logs', log as Record<string, unknown>)
  try {
    const { data } = await supabase.from('daily_logs').upsert(log, { onConflict: 'date' }).select().maybeSingle()
    if (data) { offlinePut('daily_logs', data as Record<string, unknown>); return data }
  } catch { /* offline mode — data saved locally */ }
  return log as DailyLog
}

// ─── Food ──────────────────────────────────────────────────────

export async function getFoodEntries(date: string): Promise<FoodEntry[]> {
  try {
    const { data } = await supabase.from('food_entries').select('*').eq('date', date).order('created_at', { ascending: true })
    if (data) { offlinePutAll('food_entries', data as Record<string, unknown>[]); return data }
  } catch { /* fall through */ }
  const all = await offlineGetAll<FoodEntry>('food_entries')
  return all.filter(e => e.date === date)
}

export async function getFoodEntriesRange(startDate: string, endDate: string): Promise<FoodEntry[]> {
  try {
    const { data } = await supabase.from('food_entries').select('*')
      .gte('date', startDate).lte('date', endDate).order('date', { ascending: true })
    if (data) { offlinePutAll('food_entries', data as Record<string, unknown>[]); return data }
  } catch { /* fall through */ }
  const all = await offlineGetAll<FoodEntry>('food_entries')
  return all.filter(e => e.date >= startDate && e.date <= endDate)
}

export async function addFoodEntry(entry: Omit<FoodEntry, 'id' | 'created_at'>): Promise<FoodEntry> {
  const tempId = crypto.randomUUID()
  const local = { ...entry, id: tempId, created_at: new Date().toISOString() }
  offlinePut('food_entries', local as Record<string, unknown>)
  try {
    const { data } = await supabase.from('food_entries').insert(entry).select().maybeSingle()
    if (data) {
      offlineDelete('food_entries', tempId)
      offlinePut('food_entries', data as Record<string, unknown>)
      return data
    }
  } catch { /* offline */ }
  return local
}

export async function deleteFoodEntry(id: string): Promise<void> {
  offlineDelete('food_entries', id)
  try { await supabase.from('food_entries').delete().eq('id', id) } catch { /* offline */ }
}

// ─── Finance ──────────────────────────────────────────────────

export async function getFinanceEntries(month: string): Promise<FinancialEntry[]> {
  try {
    const { data } = await supabase.from('financial_entries').select('*')
      .gte('date', `${month}-01`).lte('date', `${month}-31`).order('date', { ascending: false })
    if (data) { offlinePutAll('financial_entries', data as Record<string, unknown>[]); return data }
  } catch { /* fall through */ }
  const all = await offlineGetAll<FinancialEntry>('financial_entries')
  return all.filter(e => e.date.startsWith(month)).sort((a, b) => b.date.localeCompare(a.date))
}

export async function addFinanceEntry(entry: Omit<FinancialEntry, 'id' | 'created_at'>): Promise<FinancialEntry> {
  const tempId = crypto.randomUUID()
  const local = { ...entry, id: tempId, created_at: new Date().toISOString() }
  offlinePut('financial_entries', local as Record<string, unknown>)
  try {
    const { data } = await supabase.from('financial_entries').insert(entry).select().maybeSingle()
    if (data) {
      offlineDelete('financial_entries', tempId)
      offlinePut('financial_entries', data as Record<string, unknown>)
      return data
    }
  } catch { /* offline */ }
  return local
}

export async function deleteFinanceEntry(id: string): Promise<void> {
  offlineDelete('financial_entries', id)
  try { await supabase.from('financial_entries').delete().eq('id', id) } catch { /* offline */ }
}

// ─── Todos ────────────────────────────────────────────────────

export async function getTodos(): Promise<Todo[]> {
  try {
    const { data } = await supabase.from('todos').select('*').order('created_at', { ascending: false })
    if (data) { offlinePutAll('todos', data as Record<string, unknown>[]); return data }
  } catch { /* fall through */ }
  return offlineGetAll<Todo>('todos')
}

export async function addTodo(todo: Omit<Todo, 'id' | 'created_at' | 'updated_at'>): Promise<Todo> {
  const tempId = crypto.randomUUID()
  const local = { ...todo, id: tempId, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
  offlinePut('todos', local as Record<string, unknown>)
  try {
    const { data } = await supabase.from('todos').insert(todo).select().maybeSingle()
    if (data) {
      offlineDelete('todos', tempId)
      offlinePut('todos', data as Record<string, unknown>)
      return data
    }
  } catch { /* offline */ }
  return local
}

export async function updateTodo(id: string, patch: Partial<Todo>): Promise<void> {
  const existing = await offlineGet<Todo>('todos', id)
  if (existing) offlinePut('todos', { ...existing, ...patch, id } as Record<string, unknown>)
  try { await supabase.from('todos').update(patch).eq('id', id) } catch { /* offline */ }
}

export async function deleteTodo(id: string): Promise<void> {
  offlineDelete('todos', id)
  try { await supabase.from('todos').delete().eq('id', id) } catch { /* offline */ }
}

export async function completeTodo(id: string): Promise<void> {
  const patch = { status: 'completed' as const, completed_at: new Date().toISOString() }
  await updateTodo(id, patch)
}

// Re-export food parser
export { parseFood } from './ollama'

// ─── Workout Logs ─────────────────────────────────────────────
import type { WorkoutSession } from '@/types'

export async function getWorkoutSession(date: string): Promise<WorkoutSession | null> {
  return (await offlineGet<WorkoutSession>('workout_logs', date)) ?? null
}

export async function saveWorkoutSession(session: WorkoutSession): Promise<void> {
  const record = { ...session, updated_at: new Date().toISOString() }
  await offlinePut('workout_logs', record as Record<string, unknown>)
}

export async function getWorkoutHistory(days: number): Promise<WorkoutSession[]> {
  const all = await offlineGetAll<WorkoutSession>('workout_logs')
  return all
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, days)
}
