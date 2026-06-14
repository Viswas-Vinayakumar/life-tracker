// Local AI via Ollama — no tokens, no API keys, runs on your Mac
// Install: brew install ollama && ollama pull llama3.2:3b
import type { DailyLog, FoodEntry } from '@/types'
import { getGermanFoodContext } from './germanFoods'
import { getProfile, buildProfileContext } from './profile'
import { getGymKnowledgeContext } from './gymKnowledge'
import type { WorkoutSession } from '@/types'

const OLLAMA_BASE = 'http://127.0.0.1:11434'
const AI_MEMORY_KEY = 'lifeos_ai_memory'

// ─── AI Self-Learning Memory ─────────────────────────────────────
export interface AIMemory {
  patterns: string[]    // observed behavioral patterns
  foodHabits: string[]  // what they usually eat, preferences
  wins: string[]        // consistent good habits
  concerns: string[]    // recurring issues to address
  lastUpdated: string
}

export function getAIMemory(): AIMemory {
  if (typeof window === 'undefined') return { patterns: [], foodHabits: [], wins: [], concerns: [], lastUpdated: '' }
  try {
    const raw = localStorage.getItem(AI_MEMORY_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return { patterns: [], foodHabits: [], wins: [], concerns: [], lastUpdated: '' }
}

function appendAIMemory(update: { pattern?: string; foodHabit?: string; win?: string; concern?: string }) {
  if (typeof window === 'undefined') return
  const mem = getAIMemory()
  const push = (arr: string[], val?: string) => val && val.length > 10
    ? [...new Set([...arr, val])].slice(-12)
    : arr
  const next: AIMemory = {
    patterns:   push(mem.patterns,   update.pattern),
    foodHabits: push(mem.foodHabits, update.foodHabit),
    wins:       push(mem.wins,       update.win),
    concerns:   push(mem.concerns,   update.concern),
    lastUpdated: new Date().toISOString(),
  }
  localStorage.setItem(AI_MEMORY_KEY, JSON.stringify(next))
}

function buildMemoryContext(): string {
  const mem = getAIMemory()
  const lines: string[] = []
  if (mem.patterns.length)   lines.push(`Observed patterns: ${mem.patterns.slice(-4).join(' | ')}`)
  if (mem.foodHabits.length) lines.push(`Food habits: ${mem.foodHabits.slice(-4).join(' | ')}`)
  if (mem.wins.length)       lines.push(`Consistent wins: ${mem.wins.slice(-3).join(' | ')}`)
  if (mem.concerns.length)   lines.push(`Areas needing work: ${mem.concerns.slice(-3).join(' | ')}`)
  return lines.length ? `WHAT I KNOW ABOUT THIS USER (learned over time):\n${lines.join('\n')}` : ''
}

// ─── Ollama helpers ────────────────────────────────────────────────
export async function isOllamaRunning(): Promise<boolean> {
  try {
    const res = await fetch(`${OLLAMA_BASE}/`, { signal: AbortSignal.timeout(800) })
    return res.ok
  } catch { return false }
}

export async function getOllamaModels(): Promise<string[]> {
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/tags`, { signal: AbortSignal.timeout(1500) })
    const data = await res.json()
    return (data.models ?? []).map((m: { name: string }) => m.name)
  } catch { return [] }
}

async function getBestModel(): Promise<string> {
  const models = await getOllamaModels()
  // Prefer small fast models — 3b is enough for JSON extraction
  const preferred = ['llama3.2:3b', 'gemma3:4b', 'phi4-mini', 'llama3.2', 'gemma3', 'llama3.1', 'llama3', 'mistral', 'phi4', 'phi3']
  for (const p of preferred) {
    if (models.some(m => m.startsWith(p))) return models.find(m => m.startsWith(p))!
  }
  return models[0] ?? 'llama3.2'
}

// Ollama inference options — low temp for speed + determinism
const FAST_OPTIONS = { temperature: 0.05, top_k: 5, top_p: 0.9, num_predict: 280, num_ctx: 2048 }
const ANALYSIS_OPTIONS = { temperature: 0.2, top_k: 20, top_p: 0.9, num_predict: 400, num_ctx: 3072 }

// ─── Food parsing ─────────────────────────────────────────────────
export interface FoodNutrition {
  food_name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  sugar: number
  sodium_mg: number
}

export async function parseFoodWithOllama(input: string): Promise<FoodNutrition> {
  const model = await getBestModel()
  const profile = getProfile()
  const profileCtx = buildProfileContext(profile)
  const germanCtx = getGermanFoodContext()

  const systemContext = [
    profileCtx,
    'The user is on a CLEAN DIET targeting 10% body fat (currently ~12-14%). Prioritise accuracy for:',
    '- Sugar content (goal: <25g/day total) — flag hidden sugars in processed foods',
    '- Sodium content (goal: <2000mg/day) — common in German processed meats, bread, sauces',
    '- Protein content (key for lean muscle building)',
    'The user shops at German stores: REWE, ALDI, LIDL, NETTO, Penny, Edeka.',
    'Use German product sizes and realistic German portion sizes.',
    germanCtx,
  ].filter(Boolean).join('\n\n')

  const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(12000),
    body: JSON.stringify({
      model, stream: false, format: 'json', options: FAST_OPTIONS,
      messages: [{
        role: 'user',
        content: `${systemContext}

Nutrition expert. Parse food, return ONLY JSON, no markdown.
Food: "${input}"
{"food_name":"","calories":0,"protein":0,"carbs":0,"fat":0,"fiber":0,"sugar":0,"sodium_mg":0}
- Sum all items. German portions. Be exact on sugar + sodium.`,
      }],
    }),
  })
  if (!res.ok) throw new Error(`Ollama error: ${res.status}`)
  const data = await res.json()
  const content = data.message?.content ?? data.response ?? ''
  const parsed = typeof content === 'string' ? JSON.parse(content) : content
  return {
    food_name:  String(parsed.food_name ?? input),
    calories:   Math.round(Number(parsed.calories) || 0),
    protein:    Math.round(Number(parsed.protein) * 10) / 10,
    carbs:      Math.round(Number(parsed.carbs) * 10) / 10,
    fat:        Math.round(Number(parsed.fat) * 10) / 10,
    fiber:      Math.round(Number(parsed.fiber) * 10) / 10,
    sugar:      Math.round(Number(parsed.sugar) * 10) / 10,
    sodium_mg:  Math.round(Number(parsed.sodium_mg) || 0),
  }
}

export async function parseFood(input: string): Promise<FoodNutrition> {
  if (await isOllamaRunning()) return parseFoodWithOllama(input)

  const key = process.env.NEXT_PUBLIC_CALORIE_NINJAS_API_KEY
  if (key && key !== 'your_key_here') {
    const res = await fetch(
      `https://api.calorieninjas.com/v1/nutrition?query=${encodeURIComponent(input)}`,
      { headers: { 'X-Api-Key': key } }
    )
    if (res.ok) {
      const data = await res.json()
      const items = data.items ?? []
      if (items.length) {
        type Item = { calories: number; protein_g: number; carbohydrates_total_g: number; fat_total_g: number; fiber_g: number; sugar_g: number; sodium_mg: number; name: string }
        const t = items.reduce((a: FoodNutrition, i: Item) => ({
          food_name: '', calories: a.calories + i.calories, protein: a.protein + i.protein_g,
          carbs: a.carbs + i.carbohydrates_total_g, fat: a.fat + i.fat_total_g,
          fiber: a.fiber + i.fiber_g, sugar: a.sugar + i.sugar_g, sodium_mg: a.sodium_mg + i.sodium_mg,
        }), { food_name: '', calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium_mg: 0 })
        return { ...t, food_name: items.map((i: Item) => i.name).join(', ') }
      }
    }
  }
  throw new Error('no_ai')
}

// ─── Food / Nutrition AI Summary ─────────────────────────────────
export interface FoodSummary {
  headline: string
  rating: 'excellent' | 'good' | 'fair' | 'poor'
  insight: string
  tip: string
  highlight: string
  // Self-learning fields (stored in AIMemory)
  foodHabit?: string   // key food pattern observed today
  concern?: string     // any nutrition concern to remember
}

export async function getFoodSummary(entries: FoodEntry[]): Promise<FoodSummary | null> {
  if (!(await isOllamaRunning())) return null
  if (entries.length < 1) return null

  const totalCal    = Math.round(entries.reduce((s, e) => s + (e.calories ?? 0), 0))
  const totalProtein = Math.round(entries.reduce((s, e) => s + (e.protein ?? 0), 0))
  const totalCarbs  = Math.round(entries.reduce((s, e) => s + (e.carbs ?? 0), 0))
  const totalFat    = Math.round(entries.reduce((s, e) => s + (e.fat ?? 0), 0))
  const totalFiber  = Math.round(entries.reduce((s, e) => s + (e.fiber ?? 0), 0))
  const totalSugar  = Math.round(entries.reduce((s, e) => s + (e.sugar ?? 0), 0))
  const totalSodium = Math.round(entries.reduce((s, e) => s + (e.sodium_mg ?? 0), 0))
  const foods = entries.map(e => e.food_name ?? e.raw_input).join(', ')

  const model = await getBestModel()
  const profile = getProfile()
  const profileCtx = buildProfileContext(profile)
  const memCtx = buildMemoryContext()
  const tdee = profile.weightKg && profile.heightCm && profile.age
    ? Math.round((10 * profile.weightKg + 6.25 * profile.heightCm - 5 * profile.age + 5) * 1.55)
    : 2200
  const proteinTarget = profile.weightKg ? Math.round(profile.weightKg * 2.0) : 160

  const prompt = `Brutally honest physique coach. No sugarcoating. Goal: 10% BF + lean muscle.

${profileCtx}
${memCtx}

TODAY: ${foods}
${totalCal}kcal | ${totalProtein}g protein | ${totalSugar}g sugar | ${totalSodium}mg sodium | ${totalFiber}g fiber

HARD LIMITS: protein≥${proteinTarget}g | sugar<25g | sodium<2000mg | cal~${tdee}kcal

JSON only, no markdown:
{"headline":"max 8 words, direct","rating":"excellent|good|fair|poor","insight":"2 sentences — call out failures by number, no softening","tip":"specific fix for tomorrow, name actual German foods","highlight":"best choice today and why","foodHabit":"one pattern to remember","concern":"main concern or empty string"}`

  try {
    const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(18000),
      body: JSON.stringify({ model, stream: false, format: 'json', options: ANALYSIS_OPTIONS, messages: [{ role: 'user', content: prompt }] }),
    })
    if (!res.ok) return null
    const data = await res.json()
    const content = data.message?.content ?? data.response ?? ''
    const parsed = typeof content === 'string' ? JSON.parse(content) : content

    // Store patterns for self-learning
    if (parsed.foodHabit) appendAIMemory({ foodHabit: String(parsed.foodHabit) })
    if (parsed.concern)   appendAIMemory({ concern: String(parsed.concern) })

    return {
      headline:  String(parsed.headline ?? ''),
      rating: (['excellent', 'good', 'fair', 'poor'].includes(parsed.rating) ? parsed.rating : 'fair') as FoodSummary['rating'],
      insight:   String(parsed.insight ?? ''),
      tip:       String(parsed.tip ?? ''),
      highlight: String(parsed.highlight ?? ''),
      foodHabit: parsed.foodHabit ? String(parsed.foodHabit) : undefined,
      concern:   parsed.concern ? String(parsed.concern) : undefined,
    }
  } catch { return null }
}

// ─── Life AI Summary ─────────────────────────────────────────────
export interface LifeSummary {
  headline: string
  insight: string
  suggestion: string
  label: 'peak' | 'strong' | 'growing' | 'needs_work'
  pattern: string
}

export async function getLifeSummary(
  logs: DailyLog[],
  food: FoodEntry[],
  workouts?: WorkoutSession[],
  todoStats?: { total: number; completed: number; pending: number },
): Promise<LifeSummary | null> {
  if (!(await isOllamaRunning())) return null

  const n = logs.length
  if (n < 2) return null

  const gymRate    = Math.round(logs.filter(l => l.gym_done).length / n * 100)
  const studyRate  = Math.round(logs.filter(l => l.study_done).length / n * 100)
  const amRate     = Math.round(logs.filter(l => l.skincare_am).length / n * 100)
  const pmRate     = Math.round(logs.filter(l => l.skincare_pm).length / n * 100)
  const avgSleep   = logs.filter(l => l.sleep_hours).length > 0
    ? (logs.reduce((s, l) => s + (l.sleep_hours ?? 0), 0) / logs.filter(l => l.sleep_hours).length).toFixed(1)
    : 'not tracked'
  const avgWater   = (logs.reduce((s, l) => s + (l.water_glasses ?? 0), 0) / n).toFixed(1)
  const avgScore   = Math.round(logs.reduce((s, l) => s + (l.performance_score ?? 0), 0) / n)
  const avgMood    = logs.filter(l => l.mood).length
    ? (logs.reduce((s, l) => s + (l.mood ?? 0), 0) / logs.filter(l => l.mood).length).toFixed(1)
    : 'not tracked'

  const last7 = logs.slice(0, 7)
  const last7Score = last7.length ? Math.round(last7.reduce((s, l) => s + (l.performance_score ?? 0), 0) / last7.length) : 0
  const trend = last7Score > avgScore ? 'improving' : last7Score < avgScore ? 'declining' : 'steady'

  const avgCal    = food.length ? Math.round(food.reduce((s, f) => s + (f.calories ?? 0), 0) / n) : 0
  const avgProtein = food.length ? Math.round(food.reduce((s, f) => s + (f.protein ?? 0), 0) / n) : 0
  const avgSugar  = food.length ? Math.round(food.reduce((s, f) => s + ((f as FoodEntry & { sugar?: number }).sugar ?? 0), 0) / n) : 0
  const avgSodium = food.length ? Math.round(food.reduce((s, f) => s + ((f as FoodEntry & { sodium_mg?: number }).sodium_mg ?? 0), 0) / n) : 0

  // Gym session data
  let gymCtx = 'No gym sessions tracked yet'
  if (workouts && workouts.length > 0) {
    const totalSessions = workouts.length
    const avgVolume = Math.round(workouts.reduce((sum, w) =>
      sum + w.exercises.reduce((s, e) => s + e.sets.reduce((v, set) => v + (set.reps * (set.weight_kg ?? 0)), 0), 0), 0
    ) / totalSessions)
    const musclesCovered = [...new Set(workouts.flatMap(w => w.exercises.map(e => e.muscle_group ?? 'General')))]
    const lastSession = workouts[0]
    gymCtx = `${totalSessions} sessions tracked | avg volume: ${avgVolume > 0 ? avgVolume + 'kg' : 'bodyweight'} | muscles trained: ${musclesCovered.join(', ')} | last session: ${lastSession.date} (${lastSession.exercises.map(e => e.name).join(', ')})`
  }

  // Task data
  let taskCtx = 'No tasks tracked'
  if (todoStats && todoStats.total > 0) {
    const completionRate = Math.round(todoStats.completed / todoStats.total * 100)
    taskCtx = `${todoStats.total} tasks total | ${todoStats.completed} completed (${completionRate}%) | ${todoStats.pending} pending`
  }

  const model = await getBestModel()
  const profile = getProfile()
  const profileCtx = buildProfileContext(profile)
  const memCtx = buildMemoryContext()

  const prompt = `You are a personal life OS coach — you have access to ALL areas of this person's life: fitness, nutrition, habits, study, tasks, and wellbeing. Give a holistic, cross-domain analysis.

${profileCtx}

${memCtx}

=== COMPLETE LIFE DATA (last ${n} days) ===

HABITS:
- Gym attendance: ${gymRate}% days (target: ${(profile.gymTargetDays ?? 4)}x/week)
- Study: ${studyRate}% days
- Skincare AM: ${amRate}%, PM: ${pmRate}%
- Avg performance score: ${avgScore}/100 | trend: ${trend}

SLEEP & RECOVERY:
- Average sleep: ${avgSleep}h (target: 8h — critical for cortisol, fat loss, muscle repair)
- Average water: ${avgWater} glasses/day

MOOD & ENERGY:
- Average mood: ${avgMood}/10

NUTRITION:
- Avg calories: ${avgCal > 0 ? avgCal + ' kcal/day' : 'not tracked'}
- Avg protein: ${avgProtein > 0 ? avgProtein + 'g/day (target 150g for muscle retention)' : 'not tracked'}
- Avg sugar: ${avgSugar > 0 ? avgSugar + 'g/day (limit <25g for 10% BF)' : 'not tracked'}
- Avg sodium: ${avgSodium > 0 ? avgSodium + 'mg/day (limit <2000mg)' : 'not tracked'}

GYM SESSIONS:
- ${gymCtx}

TASKS & PRODUCTIVITY:
- ${taskCtx}

BRUTAL LIFE COACH. Tell the truth. Use real numbers. No softening.
Priority: 10% BF requires gym 4x/week + protein>150g + sugar<25g + sleep 8h. Everything else is secondary.

JSON only, no markdown:
{"headline":"max 10 words, direct truth","insight":"2-3 sentences using actual numbers — what's working, what's failing, why they're not at 10% BF yet","suggestion":"the single most impactful change this week — specific, measurable","label":"peak|strong|growing|needs_work","pattern":"one cross-domain behavioral truth about this person","win":"one thing genuinely going well","challenge":"the real obstacle, no sugarcoating"}`

  try {
    const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(22000),
      body: JSON.stringify({ model, stream: false, format: 'json', options: ANALYSIS_OPTIONS, messages: [{ role: 'user', content: prompt }] }),
    })
    if (!res.ok) return null
    const data = await res.json()
    const content = data.message?.content ?? data.response ?? ''
    const parsed = typeof content === 'string' ? JSON.parse(content) : content

    // Store patterns for self-learning
    if (parsed.pattern)   appendAIMemory({ pattern: String(parsed.pattern) })
    if (parsed.win)       appendAIMemory({ win: String(parsed.win) })
    if (parsed.challenge) appendAIMemory({ concern: String(parsed.challenge) })

    return {
      headline:   String(parsed.headline ?? ''),
      insight:    String(parsed.insight ?? ''),
      suggestion: String(parsed.suggestion ?? ''),
      label: (['peak', 'strong', 'growing', 'needs_work'].includes(parsed.label) ? parsed.label : 'growing') as LifeSummary['label'],
      pattern:    String(parsed.pattern ?? ''),
    }
  } catch { return null }
}

// ─── Gym AI Coach ─────────────────────────────────────────────
export interface GymCoachResponse {
  rating: 'excellent' | 'good' | 'fair' | 'below_par'
  headline: string
  volume_analysis: string
  overload_tip: string
  next_session: string
  recovery_tip: string
  form_note?: string
}

export async function getGymCoaching(
  session: WorkoutSession,
  history: WorkoutSession[]
): Promise<GymCoachResponse | null> {
  if (!(await isOllamaRunning())) return null

  const profile = getProfile()
  const profileCtx = buildProfileContext(profile)
  const gymKnowledge = getGymKnowledgeContext()
  const memCtx = buildMemoryContext()
  const model = await getBestModel()

  const sessionSummary = session.exercises.map(ex => {
    const setsStr = ex.sets.map((s, i) =>
      `  Set ${i+1}: ${s.reps} reps${s.weight_kg ? ` @ ${s.weight_kg}kg` : ' (bodyweight)'}`
    ).join('\n')
    const totalVol = ex.sets.reduce((sum, s) => sum + s.reps * (s.weight_kg ?? 0), 0)
    return `${ex.name}${ex.muscle_group ? ` [${ex.muscle_group}]` : ''}:\n${setsStr}\n  Volume: ${totalVol > 0 ? `${totalVol}kg` : `${ex.sets.reduce((s, set) => s + set.reps, 0)} total reps`}`
  }).join('\n\n')

  const historyCtx = history.slice(0, 5).map(h => {
    const exNames = h.exercises.map(e => {
      const top = e.sets.reduce((best, s) => (s.weight_kg ?? 0) > (best.weight_kg ?? 0) ? s : best, e.sets[0])
      return `${e.name}: ${top?.reps}r×${top?.weight_kg ?? 'BW'}kg`
    }).join(', ')
    return `${h.date}: [${exNames}]${h.duration_min ? ` ${h.duration_min}min` : ''}`
  }).join('\n')

  const prompt = `${gymKnowledge}

${profileCtx}
${memCtx}

BRUTAL PHYSIQUE COACH. Goal: lean muscle + 10% BF (currently ~${profile.bodyFatPct ?? 13}%). No praise unless earned.

SESSION ${session.date}${session.duration_min ? ` · ${session.duration_min}min` : ''}:
${sessionSummary}

HISTORY: ${historyCtx || 'First session'}

JSON only, no markdown:
{"rating":"excellent|good|fair|below_par","headline":"max 8 words","volume_analysis":"2 sentences — call out weak points, flag missing muscle groups","overload_tip":"exact exercise + weight + reps for NEXT session","next_session":"muscle groups + recovery reason","recovery_tip":"specific tonight advice","form_note":"form issue if evident, else empty"}`

  try {
    const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(22000),
      body: JSON.stringify({ model, stream: false, format: 'json', options: ANALYSIS_OPTIONS, messages: [{ role: 'user', content: prompt }] }),
    })
    if (!res.ok) return null
    const data = await res.json()
    const content = data.message?.content ?? data.response ?? ''
    const parsed = typeof content === 'string' ? JSON.parse(content) : content
    if (parsed.overload_tip) appendAIMemory({ pattern: `Gym: ${String(parsed.overload_tip)}` })
    return {
      rating: (['excellent','good','fair','below_par'].includes(parsed.rating) ? parsed.rating : 'good') as GymCoachResponse['rating'],
      headline:        String(parsed.headline ?? ''),
      volume_analysis: String(parsed.volume_analysis ?? ''),
      overload_tip:    String(parsed.overload_tip ?? ''),
      next_session:    String(parsed.next_session ?? ''),
      recovery_tip:    String(parsed.recovery_tip ?? ''),
      form_note:       parsed.form_note ? String(parsed.form_note) : undefined,
    }
  } catch { return null }
}
