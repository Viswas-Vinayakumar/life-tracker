'use client'

import { useState, useEffect } from 'react'
import { format, parseISO, subDays } from 'date-fns'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'
import { Flame, TrendingUp, Target, Trophy, Dumbbell, BookOpen, Droplets, Moon, Apple, Zap, RefreshCw, Brain } from 'lucide-react'
import type { DailyLog, FoodEntry } from '@/types'
import { getScoreColor, getScoreLabel } from '@/lib/scoring'
import { getLogs, getFoodEntriesRange } from '@/lib/db'
import { isOllamaRunning, getLifeSummary, type LifeSummary } from '@/lib/ollama'
import { format as formatDate } from 'date-fns'

const PIE_COLORS = ['#a78bfa', '#38bdf8', '#34d399', '#fbbf24', '#f87171']
const TODAY = formatDate(new Date(), 'yyyy-MM-dd')
const GOALS = { calories: 2200, protein: 150, carbs: 250, fat: 70, fiber: 30 }
const SUGAR_LIMIT   = 25    // g/day clean diet hard limit
const SODIUM_LIMIT  = 2000  // mg/day

function calcStreak(logs: DailyLog[], key: keyof DailyLog): number {
  let streak = 0
  for (const log of logs) { if (log[key]) streak++; else break }
  return streak
}

function ChartTip({ active, payload, label }: { active?: boolean; payload?: { value: number; name?: string; color?: string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="card" style={{ padding: '8px 12px', fontSize: 12 }}>
      <p className="footnote" style={{ marginBottom: 4 }}>{label}</p>
      {payload.map((p, i) => <p key={i} style={{ fontWeight: 600, color: p.color ?? 'var(--text-1)' }}>{p.name ? `${p.name}: ` : ''}{p.value}</p>)}
    </div>
  )
}

function macroScore(calories: number, protein: number, carbs: number, fat: number, fiber: number): number {
  const calScore   = Math.min(calories / GOALS.calories, 1.3)
  const proteinPct = Math.min(protein / GOALS.protein, 1)
  const carbsPct   = Math.min(carbs / GOALS.carbs, 1)
  const fatPct     = 1 - Math.abs(1 - fat / GOALS.fat) * 0.5
  const fiberPct   = Math.min(fiber / GOALS.fiber, 1)
  const calPenalty = calScore > 1 ? (calScore - 1) * 15 : 0
  const raw = (proteinPct * 35 + carbsPct * 20 + fatPct * 20 + fiberPct * 25) - calPenalty
  return Math.max(0, Math.min(100, Math.round(raw)))
}

function Ring({ score, size = 80, strokeWidth = 7, color, children }: {
  score: number; size?: number; strokeWidth?: number; color: string; children?: React.ReactNode
}) {
  const r    = (size - strokeWidth) / 2
  const circ = 2 * Math.PI * r
  const dash = Math.min(score / 100, 1) * circ
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', position: 'absolute', inset: 0 }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--bg-3)" strokeWidth={strokeWidth} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.34,1.2,0.64,1)', filter: `drop-shadow(0 0 4px ${color}60)` }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </div>
    </div>
  )
}


const LABEL_COLOR: Record<LifeSummary['label'], string> = {
  peak: 'var(--success)', strong: 'var(--cyan)', growing: 'var(--warning)', needs_work: 'var(--error)',
}
const LABEL_TEXT: Record<LifeSummary['label'], string> = {
  peak: 'Peak Form', strong: 'Strong', growing: 'Growing', needs_work: 'Needs Work',
}

export default function DashboardPage() {
  const [logs, setLogs] = useState<DailyLog[]>([])
  const [food30, setFood30] = useState<FoodEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [aiSummary, setAiSummary] = useState<LifeSummary | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [ollamaOk, setOllamaOk] = useState<boolean | null>(null)

  useEffect(() => {
    const end = TODAY
    const start = formatDate(subDays(new Date(), 29), 'yyyy-MM-dd')
    Promise.all([getLogs(30), getFoodEntriesRange(start, end), isOllamaRunning()])
      .then(([l, f30, ok]) => {
        setLogs(l); setFood30(f30); setOllamaOk(ok); setLoading(false)
        if (ok && l.length > 0) loadAiSummary(l, f30)
      })
      .catch(() => setLoading(false))
  }, [])

  const loadAiSummary = async (l: DailyLog[], f: FoodEntry[], force = false) => {
    const cacheKey = `lifeos_life_summary_${TODAY}`
    if (!force) {
      const cached = localStorage.getItem(cacheKey)
      if (cached) { try { setAiSummary(JSON.parse(cached)); return } catch { /* ignore */ } }
    }
    setAiLoading(true)
    const result = await getLifeSummary(l, f)
    if (result) { setAiSummary(result); localStorage.setItem(cacheKey, JSON.stringify(result)) }
    setAiLoading(false)
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 12, color: 'var(--text-3)' }}>
      <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid var(--accent)', borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite' }} />
    </div>
  )

  const sorted  = [...logs].sort((a, b) => b.date.localeCompare(a.date))
  const last7   = sorted.slice(0, 7).reverse()
  const last30  = sorted.slice(0, 30).reverse()

  const gymStreak       = calcStreak(sorted, 'gym_done')
  const studyStreak     = calcStreak(sorted, 'study_done')
  const skincareAmStreak = calcStreak(sorted, 'skincare_am')
  const skincarePmStreak = calcStreak(sorted, 'skincare_pm')

  const avgScore  = logs.length ? Math.round(logs.reduce((s, l) => s + (l.performance_score ?? 0), 0) / logs.length) : 0
  const last7Avg  = last7.length ? Math.round(last7.reduce((s, l) => s + (l.performance_score ?? 0), 0) / last7.length) : 0
  const bestScore = logs.length ? Math.max(...logs.map(l => l.performance_score ?? 0)) : 0
  const gymDays   = logs.filter(l => l.gym_done).length
  const studyDays = logs.filter(l => l.study_done).length

  const chartData = last30.map(l => ({
    date: format(parseISO(l.date), 'MMM d'),
    score: l.performance_score ?? 0,
    gym: l.gym_done ? 1 : 0,
    study: l.study_done ? 1 : 0,
  }))

  const habitPieData = [
    { name: 'Gym',     value: gymDays },
    { name: 'Study',   value: studyDays },
    { name: 'AM Care', value: logs.filter(l => l.skincare_am).length },
    { name: 'PM Care', value: logs.filter(l => l.skincare_pm).length },
  ].filter(d => d.value > 0)

  const streaks = [
    { label: '🏋️ Gym',    streak: gymStreak,        color: 'var(--violet)' },
    { label: '📚 Study',   streak: studyStreak,       color: 'var(--cyan)'   },
    { label: '☀️ AM Care', streak: skincareAmStreak,  color: 'var(--amber)'  },
    { label: '🌙 PM Care', streak: skincarePmStreak,  color: 'var(--indigo)' },
  ]

  const total = logs.length * 100
  const earned = logs.reduce((s, l) => s + (l.performance_score ?? 0), 0)
  const pct   = total > 0 ? Math.round((earned / total) * 100) : 0
  const level = Math.floor(pct / 10) + 1
  const levelLabels = ['Seedling', 'Rooted', 'Growing', 'Thriving', 'Blooming', 'Flourishing', 'Strong', 'Elite', 'Apex', 'Peak']

  // ── Nutrition averages ──
  const foodByDate: Record<string, FoodEntry[]> = {}
  for (const f of food30) {
    if (!foodByDate[f.date]) foodByDate[f.date] = []
    foodByDate[f.date].push(f)
  }
  const daysWithFood = Object.keys(foodByDate).length
  const fsum = (key: keyof FoodEntry) => food30.reduce((s, f) => s + ((f[key] as number) ?? 0), 0)
  const avgCal    = daysWithFood ? Math.round(fsum('calories') / daysWithFood) : 0
  const avgProtein = daysWithFood ? Math.round(fsum('protein') / daysWithFood) : 0
  const avgCarbs  = daysWithFood ? Math.round(fsum('carbs') / daysWithFood) : 0
  const avgFat    = daysWithFood ? Math.round(fsum('fat') / daysWithFood) : 0
  const avgFiber  = daysWithFood ? Math.round(fsum('fiber') / daysWithFood) : 0
  const avgSugar  = daysWithFood ? Math.round(fsum('sugar') / daysWithFood) : 0
  const avgSodium = daysWithFood ? Math.round(fsum('sodium_mg') / daysWithFood) : 0
  const nutritionScore = macroScore(avgCal, avgProtein, avgCarbs, avgFat, avgFiber)

  // ── Overall Health Score ──
  const gymRate      = logs.length ? gymDays / logs.length : 0
  const studyRate    = logs.length ? studyDays / logs.length : 0
  const skincareDays = logs.filter(l => l.skincare_am && l.skincare_pm).length
  const skincareRate = logs.length ? skincareDays / logs.length : 0
  const avgSleep     = logs.filter(l => l.sleep_hours).length
    ? logs.filter(l => l.sleep_hours).reduce((s, l) => s + (l.sleep_hours ?? 0), 0) / logs.filter(l => l.sleep_hours).length
    : 0
  const avgWater     = logs.length ? logs.reduce((s, l) => s + l.water_glasses, 0) / logs.length : 0
  const avgMood      = logs.filter(l => l.mood).length
    ? logs.filter(l => l.mood).reduce((s, l) => s + (l.mood ?? 0), 0) / logs.filter(l => l.mood).length
    : 0
  const avgEnergy    = logs.filter(l => l.energy).length
    ? logs.filter(l => l.energy).reduce((s, l) => s + (l.energy ?? 0), 0) / logs.filter(l => l.energy).length
    : 0

  const bodyScore    = Math.round(gymRate * 40 + Math.min(avgSleep / 8, 1) * 30 + Math.min(avgWater / 8, 1) * 30)
  const mindScore    = Math.round(studyRate * 50 + (avgMood / 10) * 25 + (avgEnergy / 10) * 25)
  const habitsScore  = Math.round(skincareRate * 100)
  const vitalityScore = Math.round(((avgMood / 10) + (avgEnergy / 10)) * 50)

  const healthComponents = [
    { label: 'Body',      score: bodyScore,      color: 'var(--violet)', icon: <Dumbbell size={12} />,  weight: 0.30 },
    { label: 'Mind',      score: mindScore,      color: 'var(--cyan)',   icon: <BookOpen size={12} />,  weight: 0.25 },
    { label: 'Habits',   score: habitsScore,    color: 'var(--amber)',  icon: <Droplets size={12} />,  weight: 0.20 },
    { label: 'Nutrition', score: nutritionScore, color: 'var(--success)',icon: <Apple size={12} />,     weight: 0.15 },
    { label: 'Vitality',  score: vitalityScore,  color: 'var(--indigo)', icon: <Moon size={12} />,     weight: 0.10 },
  ]
  const overallHealth = Math.round(healthComponents.reduce((s, c) => s + c.score * c.weight, 0))

  return (
    <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 1100 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <h1 className="title-lg">Stats</h1>
          <p className="footnote" style={{ marginTop: 4 }}>Last 30 days · {logs.length} days logged</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 'var(--r)', background: `color-mix(in srgb, ${getScoreColor(avgScore)} 12%, transparent)` }}>
          <Zap size={11} color={getScoreColor(avgScore)} />
          <span style={{ fontSize: 11, fontWeight: 700, color: getScoreColor(avgScore) }}>Level {level} · {levelLabels[Math.min(level - 1, 9)]}</span>
        </div>
      </div>

      {/* ── AI Life Summary ── */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <p className="section-label">AI Life Coach</p>
          <button onClick={() => loadAiSummary(logs, food30, true)} disabled={aiLoading || !ollamaOk}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 8, border: '1px solid var(--border-2)', background: 'transparent', cursor: 'default', fontSize: 10, color: 'var(--text-3)', opacity: !ollamaOk ? 0.35 : 1 }}>
            <RefreshCw size={9} style={{ animation: aiLoading ? 'spin 1s linear infinite' : 'none' }} />
            {aiLoading ? 'Analysing…' : 'Refresh'}
          </button>
        </div>
        <div className="card" style={{ padding: '16px 18px', position: 'relative', overflow: 'hidden', borderColor: aiSummary ? `color-mix(in srgb, ${LABEL_COLOR[aiSummary.label]} 25%, transparent)` : 'var(--border-2)' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, var(--violet), var(--cyan), var(--success))', opacity: 0.8 }} />
          {aiLoading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-3)', padding: '8px 0' }}>
              <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid var(--violet)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
              <span style={{ fontSize: 12 }}>Analysing your 30-day patterns…</span>
            </div>
          )}
          {!aiLoading && aiSummary && (
            <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', animation: 'fade-up 0.2s ease both' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `color-mix(in srgb, ${LABEL_COLOR[aiSummary.label]} 12%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Brain size={16} color={LABEL_COLOR[aiSummary.label]} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 10, background: `color-mix(in srgb, ${LABEL_COLOR[aiSummary.label]} 12%, transparent)`, color: LABEL_COLOR[aiSummary.label], textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                    {LABEL_TEXT[aiSummary.label]}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>{aiSummary.headline}</span>
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.7, marginBottom: 6 }}>{aiSummary.insight}</p>
                <p style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.6, marginBottom: 10 }}>{aiSummary.pattern}</p>
                {aiSummary.suggestion && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 20, background: 'var(--bg-2)', border: '1px solid var(--border-2)', color: 'var(--text-2)' }}>→ {aiSummary.suggestion}</span>
                  </div>
                )}
              </div>
            </div>
          )}
          {!aiLoading && !aiSummary && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-3)', padding: '4px 0' }}>
              <Brain size={14} style={{ opacity: 0.3 }} />
              <p style={{ fontSize: 12 }}>{ollamaOk ? 'Generating your life analysis…' : 'Install Ollama for AI coaching · brew install ollama'}</p>
            </div>
          )}
        </div>
      </section>

      {/* ── Overall Health Score ── */}
      <div className="card" style={{ padding: '22px 26px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, var(--violet), var(--cyan), var(--success), var(--amber))', opacity: 0.9 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          <Ring score={overallHealth} size={108} strokeWidth={10} color={getScoreColor(overallHealth)}>
            <span className="tabular-nums" style={{ fontSize: 26, fontWeight: 900, color: getScoreColor(overallHealth), lineHeight: 1 }}>{overallHealth}</span>
            <span style={{ fontSize: 9, color: 'var(--text-3)', marginTop: 2 }}>/100</span>
          </Ring>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>Health Score Breakdown</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {healthComponents.map(c => (
                <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, width: 80, flexShrink: 0 }}>
                    <span style={{ color: c.color, display: 'flex' }}>{c.icon}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: c.color }}>{c.label}</span>
                  </div>
                  <div style={{ flex: 1, height: 4, background: 'var(--bg-3)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${c.score}%`, background: c.color, borderRadius: 2, transition: 'width 1.1s cubic-bezier(0.34,1.2,0.64,1)', filter: `drop-shadow(0 0 3px ${c.color}80)` }} />
                  </div>
                  <span className="tabular-nums" style={{ fontSize: 11, fontWeight: 700, color: c.color, width: 28, textAlign: 'right', flexShrink: 0 }}>{c.score}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ flexShrink: 0, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ padding: '5px 12px', borderRadius: 20, background: `color-mix(in srgb, ${getScoreColor(overallHealth)} 12%, transparent)` }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: getScoreColor(overallHealth) }}>{getScoreLabel(overallHealth)}</span>
            </div>
            <p style={{ fontSize: 9, color: 'var(--text-3)' }}>Target: 10% BF</p>
          </div>
        </div>
      </div>

      {/* ── 4 stat cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        {[
          { icon: <Trophy size={13} />, label: '30-Day Avg', value: avgScore,  suffix: '/100', color: getScoreColor(avgScore) },
          { icon: <TrendingUp size={13} />, label: '7-Day Avg', value: last7Avg, suffix: '/100', color: getScoreColor(last7Avg) },
          { icon: <Target size={13} />,   label: 'Best',       value: bestScore, suffix: '/100', color: 'var(--success)' },
          { icon: <Flame size={13} />,    label: 'Gym Days',   value: gymDays,   suffix: 'd',    color: 'var(--violet)' },
        ].map(({ icon, label, value, suffix, color }) => (
          <div key={label} className="card" style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 7 }}>
              <span style={{ color }}>{icon}</span>
              <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
            </div>
            <p className="tabular-nums" style={{ fontSize: 22, fontWeight: 800, color }}>
              {value}<span style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 400 }}>{suffix}</span>
            </p>
          </div>
        ))}
      </div>

      <div style={{ height: 1, background: 'var(--border-2)' }} />

      {/* ── Performance chart ── */}
      <section>
        <p className="section-label">Performance — 30 Days</p>
        {chartData.length > 0 ? (
          <div className="card" style={{ padding: '16px 16px 10px' }}>
            <ResponsiveContainer width="100%" height={170}>
              <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
                <defs>
                  <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="var(--violet)" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="var(--violet)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-2)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTip />} />
                <Area type="monotone" dataKey="score" stroke="var(--violet)" strokeWidth={2} fill="url(#sg)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="card" style={{ padding: '48px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
            No data yet — log your first day!
          </div>
        )}
      </section>

      {/* ── Compact Nutrition Overview ── */}
      {daysWithFood > 0 && (
        <section>
          <p className="section-label">Nutrition — 30-Day Avg</p>
          <div className="card" style={{ padding: '14px 18px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {[
                { label: 'Calories',  avg: avgCal,     goal: GOALS.calories, unit: 'kcal', color: 'var(--warning)' },
                { label: 'Protein',   avg: avgProtein, goal: GOALS.protein,  unit: 'g',    color: '#a78bfa' },
                { label: 'Carbs',     avg: avgCarbs,   goal: GOALS.carbs,    unit: 'g',    color: '#38bdf8' },
                { label: 'Fat',       avg: avgFat,     goal: GOALS.fat,      unit: 'g',    color: '#fbbf24' },
                { label: 'Fiber',     avg: avgFiber,   goal: GOALS.fiber,    unit: 'g',    color: '#34d399' },
              ].map(({ label, avg, goal, unit, color }) => {
                const pct = Math.min(avg / goal, 1.5)
                const over = avg > goal * 1.1
                return (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 10, color: 'var(--text-3)', width: 58, flexShrink: 0 }}>{label}</span>
                    <div style={{ flex: 1, height: 4, background: 'var(--bg-3)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(pct * 100, 100)}%`, background: over ? 'var(--warning)' : color, borderRadius: 2, transition: 'width 1.1s cubic-bezier(0.34,1.2,0.64,1)' }} />
                    </div>
                    <span className="tabular-nums" style={{ fontSize: 10, color: over ? 'var(--warning)' : color, fontWeight: 700, width: 72, textAlign: 'right', flexShrink: 0 }}>{avg}{unit} <span style={{ fontWeight: 400, color: 'var(--text-3)' }}>/ {goal}</span></span>
                  </div>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border-2)' }}>
              {[
                { label: 'Water avg', value: `${(avgWater).toFixed(1)} gl`, color: 'var(--cyan)', limit: null },
                { label: 'Sugar avg', value: `${avgSugar}g`, color: avgSugar > SUGAR_LIMIT ? 'var(--error)' : avgSugar > 18 ? 'var(--warning)' : 'var(--success)', limit: `${SUGAR_LIMIT}g limit` },
                { label: 'Sodium avg', value: `${avgSodium < 1000 ? avgSodium : (avgSodium/1000).toFixed(1)+'k'}mg`, color: avgSodium > SODIUM_LIMIT ? 'var(--error)' : avgSodium > 1600 ? 'var(--warning)' : 'var(--success)', limit: `${SODIUM_LIMIT/1000}k limit` },
              ].map(({ label, value, color, limit }) => (
                <div key={label} style={{ flex: 1, textAlign: 'center', padding: '7px 0', borderRadius: 8, background: 'var(--bg-2)' }}>
                  <p className="tabular-nums" style={{ fontSize: 14, fontWeight: 800, color }}>{value}</p>
                  <p style={{ fontSize: 9, color: 'var(--text-3)', marginTop: 2 }}>{label}</p>
                  {limit && <p style={{ fontSize: 8, color, marginTop: 1, opacity: 0.7 }}>{limit}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Streaks ── */}
      <section>
        <p className="section-label">Current Streaks</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {streaks.map(({ label, streak, color }) => (
            <div key={label} className="card" style={{ padding: '14px 16px', position: 'relative', overflow: 'hidden' }}>
              {streak >= 3 && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: color, opacity: 0.6 }} />}
              <p style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 8 }}>{label}</p>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3 }}>
                <span className="tabular-nums" style={{ fontSize: 30, fontWeight: 800, color, lineHeight: 1 }}>{streak}</span>
                <span style={{ fontSize: 9, color: 'var(--text-3)', marginBottom: 4 }}>days</span>
              </div>
              <p style={{ fontSize: 10, marginTop: 6, color: streak >= 3 ? color : 'var(--text-3)' }}>
                {streak >= 7 ? '🔥 On fire' : streak >= 3 ? '⚡ Building' : streak > 0 ? 'Keep going' : 'Start today'}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Charts grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        {chartData.length > 0 && (
          <section>
            <p className="section-label">Gym vs Study</p>
            <div className="card" style={{ padding: '14px 14px 10px' }}>
              <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                {[{ c: 'var(--violet)', l: `Gym (${gymDays}d)` }, { c: 'var(--cyan)', l: `Study (${studyDays}d)` }].map(d => (
                  <div key={d.l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: 7, height: 7, borderRadius: 2, background: d.c }} />
                    <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{d.l}</span>
                  </div>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={100}>
                <BarChart data={chartData} margin={{ top: 0, right: 2, bottom: 0, left: -22 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-2)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 8, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <Tooltip content={<ChartTip />} />
                  <Bar dataKey="gym"   name="Gym"   fill="var(--violet)" radius={[2, 2, 0, 0]} maxBarSize={8} />
                  <Bar dataKey="study" name="Study" fill="var(--cyan)"   radius={[2, 2, 0, 0]} maxBarSize={8} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {habitPieData.length > 0 && (
          <section>
            <p className="section-label">Habit Split</p>
            <div className="card" style={{ padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <PieChart width={90} height={90}>
                  <Pie data={habitPieData} cx={40} cy={40} innerRadius={22} outerRadius={40} dataKey="value" strokeWidth={0}>
                    {habitPieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                </PieChart>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {habitPieData.map((d, i) => (
                    <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                      <span style={{ fontSize: 11, color: 'var(--text-3)', flex: 1 }}>{d.name}</span>
                      <span style={{ fontSize: 11, fontWeight: 700 }}>{d.value}d</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        <section>
          <p className="section-label">Growth Level</p>
          <div className="card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: 11, color: 'var(--text-3)' }}>Level {level}</p>
                <p style={{ fontSize: 16, fontWeight: 700, color: getScoreColor(pct) }}>{levelLabels[Math.min(level - 1, 9)]}</p>
              </div>
              <Ring score={(pct % 10) * 10} size={50} strokeWidth={5} color={getScoreColor(pct)}>
                <span className="tabular-nums" style={{ fontSize: 11, fontWeight: 800, color: getScoreColor(pct) }}>{pct}%</span>
              </Ring>
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-3)' }}>{(level * 10) - pct}pts to Level {level + 1}</p>
          </div>
        </section>
      </div>
    </div>
  )
}
