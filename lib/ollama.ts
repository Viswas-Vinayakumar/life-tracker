// Local AI via Ollama — no tokens, no API keys, runs on your Mac
// Install: brew install ollama && ollama pull llama3.2:3b
import type { DailyLog, FoodEntry } from '@/types'
import { getGermanFoodContext } from './germanFoods'
import { getProfile, buildProfileContext } from './profile'

const OLLAMA_BASE = 'http://127.0.0.1:11434'

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
  const preferred = ['llama3.2:3b', 'llama3.2', 'llama3.1', 'llama3', 'gemma3:4b', 'gemma3', 'mistral', 'phi4', 'phi3']
  for (const p of preferred) {
    if (models.some(m => m.startsWith(p))) return models.find(m => m.startsWith(p))!
  }
  return models[0] ?? 'llama3.2'
}

// ─── Food parsing ────────────────────────────────────────────────
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
    'The user lives in Germany and shops at REWE, ALDI, LIDL, NETTO, Penny.',
    'Use German product sizes and realistic German portion sizes.',
    'Be very accurate for common German grocery items (Quark, Vollkornbrot, Bratwurst, Schnitzel, Müsli, Joghurt, etc.).',
    germanCtx,
  ].filter(Boolean).join('\n\n')

  const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(15000),
    body: JSON.stringify({
      model, stream: false, format: 'json',
      messages: [{
        role: 'user',
        content: `${systemContext}

You are a nutrition expert. Parse this food and return ONLY valid JSON (no markdown, no extra text):

Food: "${input}"

{"food_name":"string","calories":0,"protein":0,"carbs":0,"fat":0,"fiber":0,"sugar":0,"sodium_mg":0}

Be realistic. Use the German food reference above if applicable. Sum values if multiple foods described.`,
      }],
    }),
  })
  if (!res.ok) throw new Error(`Ollama error: ${res.status}`)
  const data = await res.json()
  const content = data.message?.content ?? data.response ?? ''
  const parsed = typeof content === 'string' ? JSON.parse(content) : content
  return {
    food_name: String(parsed.food_name ?? input),
    calories: Math.round(Number(parsed.calories) || 0),
    protein: Math.round(Number(parsed.protein) * 10) / 10,
    carbs: Math.round(Number(parsed.carbs) * 10) / 10,
    fat: Math.round(Number(parsed.fat) * 10) / 10,
    fiber: Math.round(Number(parsed.fiber) * 10) / 10,
    sugar: Math.round(Number(parsed.sugar) * 10) / 10,
    sodium_mg: Math.round(Number(parsed.sodium_mg) || 0),
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
  headline: string          // e.g. "Well-balanced day with good protein"
  rating: 'excellent' | 'good' | 'fair' | 'poor'
  insight: string           // 2-3 sentences on the day's nutrition
  tip: string               // one actionable suggestion
  highlight: string         // best thing they ate today
}

export async function getFoodSummary(entries: FoodEntry[]): Promise<FoodSummary | null> {
  if (!(await isOllamaRunning())) return null
  if (entries.length < 1) return null

  const totalCal = Math.round(entries.reduce((s, e) => s + (e.calories ?? 0), 0))
  const totalProtein = Math.round(entries.reduce((s, e) => s + (e.protein ?? 0), 0))
  const totalCarbs = Math.round(entries.reduce((s, e) => s + (e.carbs ?? 0), 0))
  const totalFat = Math.round(entries.reduce((s, e) => s + (e.fat ?? 0), 0))
  const totalFiber = Math.round(entries.reduce((s, e) => s + (e.fiber ?? 0), 0))
  const foods = entries.map(e => e.food_name ?? e.raw_input).join(', ')

  const model = await getBestModel()
  const profile = getProfile()
  const profileCtx = buildProfileContext(profile)
  const calGoal = profile.weightKg && profile.heightCm && profile.age
    ? `${Math.round(10 * profile.weightKg + 6.25 * profile.heightCm - 5 * profile.age + 5) * 1.55} kcal estimated TDEE`
    : '2200 kcal default goal'

  const prompt = `You are a personal nutrition coach and trainer. Analyze today's food log and give a brief, personal summary.

${profileCtx}

TODAY'S FOOD (Germany): ${foods}
TOTALS: ${totalCal} kcal | ${totalProtein}g protein | ${totalCarbs}g carbs | ${totalFat}g fat | ${totalFiber}g fiber
CALORIE GOAL: ${calGoal} | Protein goal: ${profile.weightKg ? Math.round(profile.weightKg * 1.8) + 'g' : '150g'}

Respond ONLY with valid JSON, no markdown:
{"headline":"one short punchy sentence about today's nutrition (max 10 words)","rating":"excellent|good|fair|poor","insight":"2 sentences about what stands out nutritionally today","tip":"one specific actionable tip for today or tomorrow","highlight":"the single best food choice they made today"}`

  try {
    const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(20000),
      body: JSON.stringify({ model, stream: false, format: 'json', messages: [{ role: 'user', content: prompt }] }),
    })
    if (!res.ok) return null
    const data = await res.json()
    const content = data.message?.content ?? data.response ?? ''
    const parsed = typeof content === 'string' ? JSON.parse(content) : content
    return {
      headline: String(parsed.headline ?? ''),
      rating: (['excellent', 'good', 'fair', 'poor'].includes(parsed.rating) ? parsed.rating : 'fair') as FoodSummary['rating'],
      insight: String(parsed.insight ?? ''),
      tip: String(parsed.tip ?? ''),
      highlight: String(parsed.highlight ?? ''),
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

export async function getLifeSummary(logs: DailyLog[], food: FoodEntry[]): Promise<LifeSummary | null> {
  if (!(await isOllamaRunning())) return null

  const n = logs.length
  if (n < 2) return null

  const gymRate = Math.round(logs.filter(l => l.gym_done).length / n * 100)
  const studyRate = Math.round(logs.filter(l => l.study_done).length / n * 100)
  const amRate = Math.round(logs.filter(l => l.skincare_am).length / n * 100)
  const pmRate = Math.round(logs.filter(l => l.skincare_pm).length / n * 100)
  const avgSleep = logs.filter(l => l.sleep_hours).length > 0
    ? (logs.reduce((s, l) => s + (l.sleep_hours ?? 0), 0) / logs.filter(l => l.sleep_hours).length).toFixed(1)
    : 'not tracked'
  const avgWater = (logs.reduce((s, l) => s + (l.water_glasses ?? 0), 0) / n).toFixed(1)
  const avgScore = Math.round(logs.reduce((s, l) => s + (l.performance_score ?? 0), 0) / n)
  const avgMood = logs.filter(l => l.mood).length
    ? (logs.reduce((s, l) => s + (l.mood ?? 0), 0) / logs.filter(l => l.mood).length).toFixed(1)
    : 'not tracked'

  // Trend: compare last 7 days vs overall
  const last7 = logs.slice(0, 7)
  const last7Score = last7.length ? Math.round(last7.reduce((s, l) => s + (l.performance_score ?? 0), 0) / last7.length) : 0
  const trend = last7Score > avgScore ? 'improving' : last7Score < avgScore ? 'declining' : 'steady'

  const foodLogged = food.length
  const avgCal = foodLogged ? Math.round(food.reduce((s, f) => s + (f.calories ?? 0), 0) / n) : 0

  const model = await getBestModel()
  const prompt = `You are a personal wellness coach AI. Analyze this person's life data and give a short, personal, insightful summary.

DATA (last ${n} days):
- Gym: ${gymRate}% days
- Study: ${studyRate}% days
- Skincare AM: ${amRate}%, PM: ${pmRate}%
- Average sleep: ${avgSleep}h
- Average water: ${avgWater} glasses/day
- Average performance score: ${avgScore}/100
- Recent trend (7d vs overall): ${trend}
- Average mood: ${avgMood}/10
- Avg daily calories logged: ${avgCal > 0 ? avgCal + ' kcal' : 'not tracked'}

Respond with ONLY valid JSON, no markdown, no extra text:
{"headline":"one punchy sentence about overall progress (max 12 words)","insight":"2-3 sentences identifying the strongest pattern or notable trend in their data","suggestion":"one specific actionable tip tailored to their weakest area","label":"peak|strong|growing|needs_work","pattern":"identify one interesting behavioral pattern in 1 sentence"}`

  try {
    const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(25000),
      body: JSON.stringify({ model, stream: false, format: 'json', messages: [{ role: 'user', content: prompt }] }),
    })
    if (!res.ok) return null
    const data = await res.json()
    const content = data.message?.content ?? data.response ?? ''
    const parsed = typeof content === 'string' ? JSON.parse(content) : content
    return {
      headline: String(parsed.headline ?? ''),
      insight: String(parsed.insight ?? ''),
      suggestion: String(parsed.suggestion ?? ''),
      label: (['peak', 'strong', 'growing', 'needs_work'].includes(parsed.label) ? parsed.label : 'growing') as LifeSummary['label'],
      pattern: String(parsed.pattern ?? ''),
    }
  } catch { return null }
}
