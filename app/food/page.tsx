'use client'

import { useState, useEffect, useRef } from 'react'
import { format } from 'date-fns'
import { Flame, Loader2, Plus, Trash2, Leaf, RefreshCw, Sparkles, ChevronRight, Star } from 'lucide-react'
import { toast } from 'sonner'
import { getFoodEntries, addFoodEntry, deleteFoodEntry, updateFoodEntry, parseFood } from '@/lib/db'
import { isOllamaRunning, getFoodSummary, noteVerifiedFood, type FoodSummary } from '@/lib/ollama'
import { getRating, rateNutrition, removeRating, type LearnedFood } from '@/lib/verifiedNutrition'
import { logActivity } from '@/lib/activityLog'
import type { FoodEntry } from '@/types'
import ConfirmDialog from '@/components/ui/ConfirmDialog'

const TODAY = format(new Date(), 'yyyy-MM-dd')
const GOALS = { calories: 2200, protein: 150, carbs: 250, fat: 70, fiber: 30 }

const MEAL_GROUPS: { type: FoodEntry['meal_type']; emoji: string; label: string }[] = [
  { type: 'breakfast', emoji: '🌅', label: 'Breakfast' },
  { type: 'lunch',     emoji: '☀️',  label: 'Lunch'     },
  { type: 'dinner',   emoji: '🌙',  label: 'Dinner'    },
  { type: 'snack',    emoji: '🍎',  label: 'Snacks'    },
]

const RATING_COLOR: Record<FoodSummary['rating'], string> = {
  excellent: 'var(--success)', good: 'var(--cyan)', fair: 'var(--warning)', poor: 'var(--error)',
}
const RATING_BG: Record<FoodSummary['rating'], string> = {
  excellent: 'color-mix(in srgb, var(--success) 10%, transparent)',
  good:      'color-mix(in srgb, var(--cyan) 10%, transparent)',
  fair:      'color-mix(in srgb, var(--warning) 10%, transparent)',
  poor:      'color-mix(in srgb, var(--error) 10%, transparent)',
}

// Animated progress bar that fills on mount
function AnimatedBar({ pct, color, height = 8 }: { pct: number; color: string; height?: number }) {
  const [width, setWidth] = useState(0)
  useEffect(() => { const t = setTimeout(() => setWidth(Math.min(pct * 100, 100)), 80); return () => clearTimeout(t) }, [pct])
  return (
    <div style={{ height, background: 'var(--bg-3)', borderRadius: height, overflow: 'hidden' }}>
      <div style={{
        height: '100%', width: `${width}%`, background: color, borderRadius: height,
        transition: 'width 1.1s cubic-bezier(0.34,1.1,0.64,1)',
      }} />
    </div>
  )
}

// Stacked calorie distribution bar
function CalorieDistBar({ protein, carbs, fat }: { protein: number; carbs: number; fat: number }) {
  const proteinKcal = protein * 4
  const carbsKcal   = carbs * 4
  const fatKcal     = fat * 9
  const total       = proteinKcal + carbsKcal + fatKcal || 1
  const [loaded, setLoaded] = useState(false)
  useEffect(() => { const t = setTimeout(() => setLoaded(true), 120); return () => clearTimeout(t) }, [])

  const segments = [
    { label: 'Protein', kcal: proteinKcal, pct: proteinKcal / total, color: '#a78bfa' },
    { label: 'Carbs',   kcal: carbsKcal,   pct: carbsKcal   / total, color: '#38bdf8' },
    { label: 'Fat',     kcal: fatKcal,      pct: fatKcal     / total, color: '#fbbf24' },
  ]

  return (
    <div>
      <div style={{ display: 'flex', height: 10, borderRadius: 6, overflow: 'hidden', gap: 2 }}>
        {segments.map(s => (
          <div key={s.label}
            style={{
              width: loaded ? `${s.pct * 100}%` : '0%',
              background: s.color, borderRadius: 4,
              transition: 'width 1.2s cubic-bezier(0.34,1.1,0.64,1)',
              minWidth: s.kcal > 0 ? 4 : 0,
            }}
            title={`${s.label}: ${Math.round(s.kcal)} kcal (${Math.round(s.pct * 100)}%)`}
          />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 14, marginTop: 8 }}>
        {segments.map(s => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 7, height: 7, borderRadius: 2, background: s.color, flexShrink: 0 }} />
            <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{s.label}</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-2)' }}>{Math.round(s.pct * 100)}%</span>
            <span style={{ fontSize: 9, color: 'var(--text-3)' }}>({Math.round(s.kcal)} kcal)</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Single macro row
function MacroRow({ label, emoji, value, goal, color, unit = 'g', delay = 0 }: {
  label: string; emoji: string; value: number; goal: number; color: string; unit?: string; delay?: number
}) {
  const pct = value / goal
  const over = pct > 1
  return (
    <div style={{ animation: `fade-up 0.25s ${delay}s ease both` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 14 }}>{emoji}</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)' }}>{label}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
          <span className="tabular-nums" style={{ fontSize: 15, fontWeight: 800, color: over ? 'var(--warning)' : color }}>{value}</span>
          <span style={{ fontSize: 10, color: 'var(--text-3)' }}>/ {goal}{unit}</span>
          <span style={{
            fontSize: 9, fontWeight: 700, marginLeft: 4, padding: '1px 5px', borderRadius: 4,
            background: over ? 'color-mix(in srgb, var(--warning) 12%, transparent)' : `color-mix(in srgb, ${color} 12%, transparent)`,
            color: over ? 'var(--warning)' : color,
          }}>{Math.round(pct * 100)}%</span>
        </div>
      </div>
      <AnimatedBar pct={pct} color={over ? 'var(--warning)' : color} height={5} />
    </div>
  )
}

export default function FoodPage() {
  const [food, setFood] = useState<FoodEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [ollamaOk, setOllamaOk] = useState<boolean | null>(null)
  const [input, setInput] = useState('')
  const [qty, setQty] = useState('')
  const [unit, setUnit] = useState('g')
  const [mealType, setMealType] = useState<FoodEntry['meal_type']>('snack')
  const [parsing, setParsing] = useState(false)
  const [confirm, setConfirm] = useState<{ open: boolean; entry?: FoodEntry }>({ open: false })
  // Accuracy ratings the user has given (keyed by raw_input)
  const [ratings, setRatings] = useState<Record<string, LearnedFood | null>>({})
  // Which entry's rating panel is open, plus its draft state
  const [ratingOpen, setRatingOpen] = useState<string | null>(null)
  const [draftStars, setDraftStars] = useState(0)
  const [draftVals, setDraftVals] = useState<{ calories: string; protein: string; carbs: string; fat: string; fiber: string }>({ calories: '', protein: '', carbs: '', fat: '', fiber: '' })

  // AI food summary
  const [aiSummary, setAiSummary] = useState<FoodSummary | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const aiRequested = useRef(false)

  useEffect(() => {
    Promise.all([getFoodEntries(TODAY), isOllamaRunning()])
      .then(([f, ollama]) => { setFood(f); setOllamaOk(ollama); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  // Reflect which logged foods already have an accuracy rating
  useEffect(() => {
    const map: Record<string, LearnedFood | null> = {}
    for (const e of food) map[e.raw_input] = getRating(e.raw_input)
    setRatings(map)
  }, [food])

  // Auto-load AI summary when food is ready + Ollama is up
  useEffect(() => {
    if (ollamaOk && food.length >= 1 && !aiRequested.current) {
      aiRequested.current = true
      const cacheKey = `lifeos_food_summary_${TODAY}`
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        try { setAiSummary(JSON.parse(cached)); return } catch { /* ignore */ }
      }
      loadAiSummary(food)
    }
  }, [ollamaOk, food])

  const loadAiSummary = async (entries: FoodEntry[], force = false) => {
    const cacheKey = `lifeos_food_summary_${TODAY}`
    if (!force) {
      const cached = localStorage.getItem(cacheKey)
      if (cached) { try { setAiSummary(JSON.parse(cached)); return } catch { /* ignore */ } }
    }
    setAiLoading(true)
    const result = await getFoodSummary(entries)
    if (result) {
      setAiSummary(result)
      localStorage.setItem(cacheKey, JSON.stringify(result))
    }
    setAiLoading(false)
  }

  const buildQuery = (): string => {
    const food = input.trim()
    if (!food) return ''
    const q = qty.trim()
    if (!q || !unit || unit === 'auto') return food
    if (unit === 'pcs') return `${q} ${food}`
    return `${food} ${q}${unit}`
  }

  const handleAdd = async () => {
    const query = buildQuery()
    if (!query || parsing) return
    setParsing(true)
    try {
      const nutrition = await parseFood(query)
      const entry = await addFoodEntry({ date: TODAY, raw_input: query, meal_type: mealType, ...nutrition })
      const next = [...food, entry]
      setFood(next)
      setInput('')
      setQty('')
      await logActivity('food', 'added', `Logged ${nutrition.food_name ?? query} (${nutrition.calories} kcal)`)
      toast.success(`${nutrition.food_name ?? 'Food'} — ${nutrition.calories} kcal`)
      if (ollamaOk) { aiRequested.current = false; loadAiSummary(next, true) }
    } catch (e) {
      const msg = e instanceof Error ? e.message : ''
      toast.error(
        msg === 'no_ai'
          ? 'No AI — start Ollama or add CalorieNinjas key'
          : `Couldn't recognise "${input.trim()}" — check the spelling or add a quantity (e.g. 200g)`
      )
    } finally { setParsing(false) }
  }

  // Open the rating panel for an entry, pre-filling its current macros so the
  // user can correct partial values (e.g. from real values online).
  const openRating = (entry: FoodEntry) => {
    if (ratingOpen === entry.id) { setRatingOpen(null); return }
    const existing = getRating(entry.raw_input)
    setDraftStars(existing?.rating ?? 0)
    setDraftVals({
      calories: String(entry.calories ?? 0),
      protein:  String(entry.protein ?? 0),
      carbs:    String(entry.carbs ?? 0),
      fat:      String(entry.fat ?? 0),
      fiber:    String(entry.fiber ?? 0),
    })
    setRatingOpen(entry.id ?? null)
  }

  // Save a rating (+ any value corrections). Corrected values become verified
  // ground truth reused by parseFood, fix the entry's totals immediately, and
  // teach the coaching AI's memory — so the app learns this food over time.
  const saveRating = async (entry: FoodEntry) => {
    const key = entry.raw_input
    const num = (s: string) => Math.max(0, Number(s) || 0)
    const vals = { calories: num(draftVals.calories), protein: num(draftVals.protein), carbs: num(draftVals.carbs), fat: num(draftVals.fat), fiber: num(draftVals.fiber) }
    const corrected =
      vals.calories !== Math.round((entry.calories ?? 0)) ||
      vals.protein !== (entry.protein ?? 0) || vals.carbs !== (entry.carbs ?? 0) ||
      vals.fat !== (entry.fat ?? 0) || vals.fiber !== (entry.fiber ?? 0)
    // Giving exact values implies full accuracy; otherwise require a star.
    const rating = draftStars || (corrected ? 5 : 0)
    if (!rating) { toast('Pick a star rating, or correct the values'); return }

    const e = entry as FoodEntry & { sugar?: number; sodium_mg?: number }
    const nutrition = { food_name: entry.food_name ?? entry.raw_input, ...vals, sugar: e.sugar ?? 0, sodium_mg: e.sodium_mg ?? 0 }
    rateNutrition(key, nutrition, rating, corrected)

    let nextFood = food
    if (corrected && entry.id) {
      await updateFoodEntry(entry.id, vals)
      nextFood = food.map(f => f.id === entry.id ? { ...f, ...vals } : f)
      setFood(nextFood)
    }
    setRatings(r => ({ ...r, [key]: getRating(key) }))
    noteVerifiedFood(nutrition.food_name, vals.calories, vals.protein, rating, corrected)
    await logActivity('ml', corrected ? 'corrected' : 'rated',
      `${corrected ? 'Corrected' : 'Rated'} "${nutrition.food_name}" ${rating}★${corrected ? ` → ${vals.calories}kcal, ${vals.protein}g P` : ''}`)
    setRatingOpen(null)
    toast.success(corrected ? 'Values corrected — the app learned this food' : `Rated ${rating}★ — thanks, the app is learning`)
    if (corrected && ollamaOk) { aiRequested.current = false; loadAiSummary(nextFood, true) }
  }

  const clearRating = (entry: FoodEntry) => {
    removeRating(entry.raw_input)
    setRatings(r => ({ ...r, [entry.raw_input]: null }))
    setRatingOpen(null)
    toast('Rating removed')
  }

  const handleDelete = async () => {
    if (!confirm.entry?.id) return
    await deleteFoodEntry(confirm.entry.id)
    await logActivity('food', 'deleted', `Deleted ${confirm.entry.food_name ?? confirm.entry.raw_input}`)
    const next = food.filter(e => e.id !== confirm.entry!.id)
    setFood(next)
    setConfirm({ open: false })
    toast.success('Entry removed')
    if (ollamaOk && next.length >= 1) loadAiSummary(next, true)
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid var(--accent)', borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite' }} />
    </div>
  )

  // ── Totals ──
  const totals = food.reduce(
    (a, e) => ({ cal: a.cal + (e.calories ?? 0), protein: a.protein + (e.protein ?? 0), carbs: a.carbs + (e.carbs ?? 0), fat: a.fat + (e.fat ?? 0), fiber: a.fiber + (e.fiber ?? 0) }),
    { cal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  )
  const sugar  = Math.round(food.reduce((a, e) => a + ((e as FoodEntry & { sugar?: number }).sugar ?? 0), 0))
  const sodium = Math.round(food.reduce((a, e) => a + ((e as FoodEntry & { sodium_mg?: number }).sodium_mg ?? 0), 0))
  const t = { cal: Math.round(totals.cal), protein: Math.round(totals.protein), carbs: Math.round(totals.carbs), fat: Math.round(totals.fat), fiber: Math.round(totals.fiber) }
  const SUGAR_LIMIT  = 25    // g/day
  const SODIUM_LIMIT = 2000  // mg/day

  const calPct  = t.cal / GOALS.calories
  const calColor = t.cal > GOALS.calories * 1.1 ? 'var(--error)' : t.cal >= GOALS.calories * 0.85 ? 'var(--success)' : 'var(--warning)'
  const calLeft  = GOALS.calories - t.cal

  return (
    <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1050 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', animation: 'fade-up 0.18s ease both' }}>
        <div>
          <h1 className="title-lg">Food</h1>
          <p className="footnote" style={{ marginTop: 4 }}>{format(new Date(), 'EEEE, MMMM d')} · {food.length} {food.length === 1 ? 'entry' : 'entries'}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 11px', borderRadius: 20,
          background: ollamaOk ? 'color-mix(in srgb, var(--success) 10%, transparent)' : 'var(--bg-2)',
          border: `1px solid ${ollamaOk ? 'color-mix(in srgb, var(--success) 30%, transparent)' : 'var(--border-2)'}`,
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: ollamaOk ? 'var(--success)' : 'var(--text-3)' }} />
          <span style={{ fontSize: 10, fontWeight: 600, color: ollamaOk ? 'var(--success)' : 'var(--text-3)' }}>
            {ollamaOk ? 'Ollama AI' : 'No AI'}
          </span>
        </div>
      </div>

      {/* ── Input ── */}
      <div className="card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10, animation: 'fade-up 0.2s 0.04s ease both' }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Log what you ate</p>
        <div style={{ display: 'flex', gap: 8 }}>
          {/* Meal type */}
          <select value={mealType} onChange={e => setMealType(e.target.value as FoodEntry['meal_type'])}
            style={{ height: 38, padding: '0 10px', borderRadius: 9, border: '1px solid var(--border)', fontSize: 13, background: 'var(--bg-2)', color: 'var(--text-1)', flexShrink: 0, cursor: 'default' }}>
            <option value="breakfast">🌅 Breakfast</option>
            <option value="lunch">☀️ Lunch</option>
            <option value="dinner">🌙 Dinner</option>
            <option value="snack">🍎 Snack</option>
          </select>
          {/* Food name */}
          <input
            value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="Food name — e.g. chicken breast, 3 eggs, pommes 200g…" disabled={parsing}
            style={{ flex: 1, height: 38, borderRadius: 9, border: '1px solid var(--border)', padding: '0 12px', fontSize: 13, background: 'var(--bg-2)', color: 'var(--text-1)', transition: 'border-color 0.15s', minWidth: 0 }}
            onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
            onBlur={e => (e.target.style.borderColor = 'var(--border)')}
          />
          {/* Optional quantity */}
          <input
            type="number" min="0" step="any"
            value={qty} onChange={e => setQty(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="Qty" disabled={parsing}
            style={{ width: 62, height: 38, borderRadius: 9, border: '1px solid var(--border)', padding: '0 8px', fontSize: 13, background: 'var(--bg-2)', color: 'var(--text-1)', flexShrink: 0, textAlign: 'center' }}
          />
          {/* Unit */}
          <select value={unit} onChange={e => setUnit(e.target.value)}
            style={{ height: 38, padding: '0 6px', borderRadius: 9, border: '1px solid var(--border)', fontSize: 12, background: 'var(--bg-2)', color: 'var(--text-1)', flexShrink: 0, cursor: 'default' }}>
            <option value="auto">—</option>
            <option value="g">g</option>
            <option value="ml">ml</option>
            <option value="pcs">pcs</option>
            <option value="oz">oz</option>
            <option value="tbsp">tbsp</option>
            <option value="tsp">tsp</option>
            <option value="cup">cup</option>
          </select>
          {/* Add button */}
          <button onClick={handleAdd} disabled={parsing || !input.trim()}
            style={{ width: 38, height: 38, borderRadius: 9, background: 'var(--accent)', border: 'none', cursor: 'default', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: (parsing || !input.trim()) ? 0.4 : 1, transition: 'opacity 0.15s, transform 0.1s' }}
            onMouseDown={e => { if (!parsing && input.trim()) e.currentTarget.style.transform = 'scale(0.92)' }}
            onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}>
            {parsing ? <Loader2 size={15} style={{ animation: 'spin 0.7s linear infinite' }} /> : <Plus size={15} />}
          </button>
        </div>
        <p style={{ fontSize: 10, color: 'var(--text-3)' }}>
          Tip: type everything in the name field <span style={{ opacity: 0.6 }}>(e.g. "3 eggs" or "pommes 200g")</span> or use the qty + unit fields for precision
          {ollamaOk === false && <span> · 💡 <code style={{ fontSize: 9 }}>ollama pull llama3.2:3b</code> for AI</span>}
        </p>
      </div>

      {/* ── 2-column: macros left, AI summary right ── */}
      {food.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 14, alignItems: 'start', animation: 'fade-up 0.22s 0.07s ease both' }}>

          {/* LEFT: Calories + Macros */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Calorie card */}
            <div className="card" style={{ padding: '16px 18px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${calColor}, transparent)` }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Flame size={14} color={calColor} />
                  <span style={{ fontSize: 12, fontWeight: 700 }}>Calories Today</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                  <span className="tabular-nums" style={{ fontSize: 24, fontWeight: 900, color: calColor, letterSpacing: '-0.5px' }}>{t.cal.toLocaleString()}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-3)' }}>/ {GOALS.calories.toLocaleString()}</span>
                </div>
              </div>
              <AnimatedBar pct={calPct} color={calColor} height={7} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, marginBottom: 14 }}>
                <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{Math.round(calPct * 100)}% of goal</span>
                <span style={{ fontSize: 10, color: calLeft > 0 ? 'var(--text-3)' : 'var(--error)', fontWeight: calLeft <= 0 ? 700 : 400 }}>
                  {calLeft > 0 ? `${calLeft.toLocaleString()} remaining` : `${Math.abs(calLeft).toLocaleString()} over`}
                </span>
              </div>
              <p style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>Calorie split</p>
              <CalorieDistBar protein={t.protein} carbs={t.carbs} fat={t.fat} />
            </div>

            {/* Macro rows */}
            <div className="card" style={{ padding: '14px 16px' }}>
              <p style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>Macros & Nutrients</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                <MacroRow label="Protein"       emoji="🥩" value={t.protein} goal={GOALS.protein} color="#a78bfa" delay={0}    />
                <MacroRow label="Carbohydrates" emoji="🌾" value={t.carbs}   goal={GOALS.carbs}   color="#38bdf8" delay={0.04} />
                <MacroRow label="Fat"           emoji="🥑" value={t.fat}     goal={GOALS.fat}     color="#fbbf24" delay={0.08} />
                <MacroRow label="Fiber"         emoji="🌿" value={t.fiber}   goal={GOALS.fiber}   color="#34d399" delay={0.12} />
              </div>
            </div>

            {/* Sugar & Sodium limits */}
            {(sugar > 0 || sodium > 0) && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { label: 'Sugar', value: sugar, limit: SUGAR_LIMIT, unit: 'g', color: sugar > SUGAR_LIMIT ? 'var(--error)' : sugar > SUGAR_LIMIT * 0.7 ? 'var(--warning)' : 'var(--success)', tip: 'Clean diet limit' },
                  { label: 'Sodium', value: sodium, limit: SODIUM_LIMIT, unit: 'mg', color: sodium > SODIUM_LIMIT ? 'var(--error)' : sodium > SODIUM_LIMIT * 0.75 ? 'var(--warning)' : 'var(--success)', tip: 'Water retention' },
                ].map(({ label, value, limit, unit, color, tip }) => {
                  const pct = Math.min(value / limit, 1.5)
                  const over = value > limit
                  return (
                    <div key={label} className="card" style={{ padding: '11px 13px', position: 'relative', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: color }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-2)' }}>{label}</span>
                        {over && <span style={{ fontSize: 8, fontWeight: 800, padding: '1px 5px', borderRadius: 6, background: 'color-mix(in srgb, var(--error) 12%, transparent)', color: 'var(--error)' }}>OVER</span>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginBottom: 5 }}>
                        <span className="tabular-nums" style={{ fontSize: 18, fontWeight: 900, color }}>{value < 1000 ? value : `${(value/1000).toFixed(1)}k`}</span>
                        <span style={{ fontSize: 9, color: 'var(--text-3)' }}>{unit}</span>
                        <span style={{ fontSize: 9, color: 'var(--text-3)', marginLeft: 2 }}>/ {limit < 1000 ? limit : `${limit/1000}k`}{unit}</span>
                      </div>
                      <div style={{ height: 3, background: 'var(--bg-3)', borderRadius: 2, overflow: 'hidden', marginBottom: 4 }}>
                        <div style={{ height: '100%', width: `${Math.min(pct * 100, 100)}%`, background: color, borderRadius: 2, transition: 'width 1s cubic-bezier(0.34,1.1,0.64,1)' }} />
                      </div>
                      <p style={{ fontSize: 9, color: 'var(--text-3)' }}>{tip} · {over ? `${value - limit}${unit} over` : `${limit - value}${unit} left`}</p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* RIGHT: AI Nutrition Summary */}
          <div className="card" style={{
            padding: '16px 18px', position: 'relative', overflow: 'hidden', height: '100%',
            borderColor: aiSummary ? `color-mix(in srgb, ${RATING_COLOR[aiSummary.rating]} 25%, transparent)` : 'var(--border-2)',
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, var(--success), var(--cyan))', opacity: 0.7 }} />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 26, height: 26, borderRadius: 7, background: 'color-mix(in srgb, var(--success) 12%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Leaf size={13} color="var(--success)" />
                </div>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 700 }}>Nutrition AI</p>
                  <p className="footnote">Personal coach · local AI</p>
                </div>
              </div>
              <button onClick={() => loadAiSummary(food, true)} disabled={aiLoading || !ollamaOk}
                title="Refresh" style={{ width: 26, height: 26, borderRadius: 7, border: 'none', background: 'var(--bg-2)', cursor: 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-2)', opacity: !ollamaOk ? 0.35 : 1 }}>
                <RefreshCw size={11} style={{ animation: aiLoading ? 'spin 1s linear infinite' : 'none' }} />
              </button>
            </div>

            {aiLoading && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '32px 0', color: 'var(--text-3)' }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid var(--success)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
                <span style={{ fontSize: 12 }}>Analysing nutrition…</span>
              </div>
            )}

            {!aiLoading && aiSummary && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, animation: 'fade-up 0.2s ease both' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ padding: '3px 9px', borderRadius: 20, fontSize: 10, fontWeight: 800, background: RATING_BG[aiSummary.rating], color: RATING_COLOR[aiSummary.rating], textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                    {aiSummary.rating}
                  </span>
                </div>
                <p style={{ fontSize: 15, fontWeight: 700, color: RATING_COLOR[aiSummary.rating], lineHeight: 1.35 }}>{aiSummary.headline}</p>
                <p style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.7 }}>{aiSummary.insight}</p>
                <div style={{ height: 1, background: 'var(--border-2)' }} />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 5 }}>
                    <Sparkles size={10} color="var(--warning)" />
                    <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--warning)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Best choice today</span>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.55 }}>{aiSummary.highlight}</p>
                </div>
                <div style={{ padding: '10px 12px', borderRadius: 10, background: 'color-mix(in srgb, var(--success) 7%, transparent)', border: '1px solid color-mix(in srgb, var(--success) 18%, transparent)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 5 }}>
                    <ChevronRight size={10} color="var(--success)" />
                    <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--success)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Coach tip</span>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.55 }}>{aiSummary.tip}</p>
                </div>
              </div>
            )}

            {!aiLoading && !aiSummary && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '28px 0', color: 'var(--text-3)', textAlign: 'center' }}>
                <Leaf size={22} style={{ opacity: 0.3 }} />
                <p style={{ fontSize: 12 }}>{ollamaOk ? 'Generating analysis…' : 'Install Ollama for AI coaching.'}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Food entries by meal ── */}
      {MEAL_GROUPS.map(({ type, emoji, label }, gi) => {
        const entries = food.filter(e => e.meal_type === type)
        if (entries.length === 0) return null
        const mealCal = Math.round(entries.reduce((s, e) => s + (e.calories ?? 0), 0))
        return (
          <section key={type} style={{ animation: `fade-up 0.22s ${0.16 + gi * 0.04}s ease both` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
              <p className="section-label">{emoji} {label}</p>
              <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>{mealCal} kcal</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {entries.map((entry, ei) => {
                const rated = ratings[entry.raw_input]
                const isOpen = ratingOpen === entry.id
                const rColor = rated ? (rated.rating >= 4 ? 'var(--success)' : rated.rating >= 3 ? 'var(--warning)' : 'var(--error)') : 'var(--text-3)'
                return (
                <div key={entry.id}
                  style={{
                    borderRadius: 12, background: 'var(--surface)', overflow: 'hidden',
                    border: `1px solid ${isOpen ? 'var(--border)' : 'var(--border-2)'}`,
                    animation: `fade-up 0.18s ${ei * 0.03}s ease both`,
                    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 12px color-mix(in srgb, var(--text-1) 6%, transparent)')}
                  onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
                >
                  {/* Top row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                        {entry.food_name ?? entry.raw_input}
                      </p>
                      <div style={{ display: 'flex', gap: 10, marginTop: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--warning)' }}>{entry.calories ?? 0} kcal</span>
                        {entry.protein != null && <span style={{ fontSize: 11, color: '#a78bfa' }}>P {entry.protein}g</span>}
                        {entry.carbs   != null && <span style={{ fontSize: 11, color: '#38bdf8' }}>C {entry.carbs}g</span>}
                        {entry.fat     != null && <span style={{ fontSize: 11, color: '#fbbf24' }}>F {entry.fat}g</span>}
                        {entry.fiber   != null && <span style={{ fontSize: 11, color: '#34d399' }}>Fi {entry.fiber}g</span>}
                        {rated?.corrected && <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--success)', padding: '1px 5px', borderRadius: 5, background: 'color-mix(in srgb, var(--success) 12%, transparent)' }}>corrected</span>}
                      </div>
                    </div>
                    {/* Accuracy rating — rate 1–5 or correct the values; teaches the app */}
                    <button
                      onClick={() => openRating(entry)}
                      title={rated ? `Rated ${rated.rating}/5 accurate — click to change or correct` : 'Rate accuracy (1–5) or correct the values'}
                      style={{
                        height: 30, minWidth: 30, padding: rated ? '0 9px' : 0, borderRadius: 8, flexShrink: 0,
                        border: `1px solid ${rated ? `color-mix(in srgb, ${rColor} 35%, transparent)` : 'var(--border-2)'}`,
                        background: rated ? `color-mix(in srgb, ${rColor} 12%, transparent)` : (isOpen ? 'var(--bg-2)' : 'none'),
                        color: rated ? rColor : 'var(--text-3)',
                        cursor: 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3,
                        transition: 'background 0.15s, color 0.15s, border-color 0.15s, transform 0.1s',
                      }}
                      onMouseEnter={e => { if (!rated) e.currentTarget.style.color = 'var(--warning)' }}
                      onMouseLeave={e => { if (!rated) e.currentTarget.style.color = 'var(--text-3)' }}
                      onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.9)')}
                      onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
                    >
                      <Star size={13} fill={rated ? rColor : 'none'} />
                      {rated && <span className="tabular-nums" style={{ fontSize: 11, fontWeight: 800 }}>{rated.rating}</span>}
                    </button>
                    <button
                      onClick={() => setConfirm({ open: true, entry })}
                      title="Delete entry"
                      style={{
                        width: 30, height: 30, borderRadius: 8, border: '1px solid var(--border-2)', background: 'none',
                        cursor: 'default', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'var(--error)', flexShrink: 0,
                        transition: 'background 0.15s, transform 0.1s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'color-mix(in srgb, var(--error) 10%, transparent)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                      onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.88)')}
                      onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>

                  {/* Expandable rating + correction panel */}
                  {isOpen && (
                    <div style={{ padding: '12px 14px', borderTop: '1px solid var(--border-2)', background: 'var(--bg-2)', animation: 'fade-up 0.16s ease both' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)' }}>How accurate are these values?</span>
                        <div style={{ display: 'flex', gap: 1 }}>
                          {[1, 2, 3, 4, 5].map(n => (
                            <button key={n} onClick={() => setDraftStars(n)} title={`${n} / 5`}
                              style={{ border: 'none', background: 'none', cursor: 'default', padding: 2, display: 'flex', transition: 'transform 0.1s' }}
                              onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.82)')}
                              onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
                            >
                              <Star size={18} fill={n <= draftStars ? 'var(--warning)' : 'none'} color={n <= draftStars ? 'var(--warning)' : 'var(--text-3)'} />
                            </button>
                          ))}
                        </div>
                      </div>
                      <p style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 7 }}>
                        Correct the values if you know better <span style={{ opacity: 0.7 }}>(e.g. checked online — even partial fixes teach the app)</span>
                      </p>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, marginBottom: 11 }}>
                        {([['calories', 'kcal', 'var(--warning)'], ['protein', 'P', '#a78bfa'], ['carbs', 'C', '#38bdf8'], ['fat', 'F', '#fbbf24'], ['fiber', 'Fi', '#34d399']] as const).map(([k, lbl, col]) => (
                          <label key={k} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <span style={{ fontSize: 9, fontWeight: 800, color: col, letterSpacing: '0.02em' }}>{lbl}</span>
                            <input type="number" min="0" step="any" value={draftVals[k]}
                              onChange={ev => setDraftVals(v => ({ ...v, [k]: ev.target.value }))}
                              style={{ height: 30, borderRadius: 7, border: '1px solid var(--border)', padding: '0 6px', fontSize: 12, background: 'var(--surface)', color: 'var(--text-1)', width: '100%', minWidth: 0, textAlign: 'center' }}
                            />
                          </label>
                        ))}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button onClick={() => saveRating(entry)}
                          style={{ height: 30, padding: '0 16px', borderRadius: 8, background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'default', fontSize: 12, fontWeight: 700 }}>
                          Save
                        </button>
                        <button onClick={() => setRatingOpen(null)}
                          style={{ height: 30, padding: '0 12px', borderRadius: 8, background: 'none', color: 'var(--text-2)', border: '1px solid var(--border)', cursor: 'default', fontSize: 12, fontWeight: 600 }}>
                          Cancel
                        </button>
                        {rated && (
                          <button onClick={() => clearRating(entry)}
                            style={{ marginLeft: 'auto', height: 30, padding: '0 8px', borderRadius: 8, background: 'none', color: 'var(--text-3)', border: 'none', cursor: 'default', fontSize: 11, fontWeight: 600 }}>
                            Remove rating
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                )
              })}
            </div>
          </section>
        )
      })}

      {food.length === 0 && (
        <div className="card" style={{ padding: '52px 0', textAlign: 'center', color: 'var(--text-3)', animation: 'fade-up 0.2s ease both' }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>🥗</div>
          <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 5 }}>Nothing logged yet</p>
          <p style={{ fontSize: 12 }}>Type what you ate above and press Enter</p>
        </div>
      )}

      <ConfirmDialog
        open={confirm.open}
        title="Delete this entry?"
        message={`Remove "${confirm.entry?.food_name ?? confirm.entry?.raw_input}" from today's log? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setConfirm({ open: false })}
      />
    </div>
  )
}
