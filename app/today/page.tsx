'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { format, subDays } from 'date-fns'
import Link from 'next/link'
import { Droplets, Moon, Zap, Smile, ChevronDown, ChevronUp, Flame, Beef, Wheat, Loader2, Plus, X, CalendarDays } from 'lucide-react'
import { toast } from 'sonner'
import HabitToggle from '@/components/habits/HabitToggle'
import ScoreRing from '@/components/habits/ScoreRing'
import { calculateScore } from '@/lib/scoring'
import { getLog, upsertLog, getFoodEntries, addFoodEntry, deleteFoodEntry, parseFood } from '@/lib/db'
import { logActivity } from '@/lib/activityLog'
import { isOllamaRunning } from '@/lib/ollama'
import type { DailyLog, FoodEntry } from '@/types'
import ConfirmDialog from '@/components/ui/ConfirmDialog'

const TODAY = format(new Date(), 'yyyy-MM-dd')
const H = new Date().getHours()
const GREETING = H < 5 ? 'Good Night' : H < 12 ? 'Good Morning' : H < 17 ? 'Good Afternoon' : 'Good Evening'

const DEFAULT: DailyLog = { date: TODAY, gym_done: false, gym_notes: '', study_done: false, study_notes: '', skincare_am: false, skincare_pm: false, water_glasses: 0 }

const DAILY_QUOTES = [
  { text: "I would rather burn the boat and learn to swim than wonder what's on the other side of the shore.", author: "— Your mindset" },
  { text: "Breathe, relax — you are in Germany. You made it this far.", author: "— Berlin life" },
  { text: "Good morning with an espresso. The rest follows.", author: "— Morning ritual" },
  { text: "Discipline is choosing between what you want now and what you want most.", author: "— Ancient wisdom" },
  { text: "Strong body, sharp mind — that is the whole game.", author: "— The formula" },
  { text: "Progress, not perfection. Every rep, every day counts.", author: "— Training truth" },
  { text: "The best investment you can make is in yourself.", author: "— W. Buffett" },
  { text: "Berlin is cold. Your ambition doesn't have to be.", author: "— Berlin life" },
  { text: "Consistency over intensity. Show up, always.", author: "— Long game" },
  { text: "The pain you feel today is the strength you feel tomorrow.", author: "— Iron law" },
  { text: "You came this far not to only come this far.", author: "— Keep going" },
  { text: "Stillwater runs deep. So does the work you do in silence.", author: "— Silent grind" },
  { text: "Champions train when no one is watching. Today is that day.", author: "— Championship mindset" },
  { text: "One espresso, one workout, one step. Compound everything.", author: "— Daily formula" },
  { text: "What you do today is what you become tomorrow.", author: "— Identity shift" },
  { text: "The goal is not to be better than others. It's to be better than you were yesterday.", author: "— Self-competition" },
  { text: "Rest when you're done. Not when you're tired.", author: "— Endurance" },
  { text: "Your future self is watching your choices today. Make them proud.", author: "— Future you" },
  { text: "Eat clean, train mean, think sharp. That's the blueprint.", author: "— The system" },
  { text: "Europe is a privilege. Use the energy of new beginnings.", author: "— New chapter" },
]

function getDailyQuote() {
  const day = Math.floor(Date.now() / 86400000)
  return DAILY_QUOTES[day % DAILY_QUOTES.length]
}

export default function TodayPage() {
  const [log, setLog] = useState<DailyLog>(DEFAULT)
  const [food, setFood] = useState<FoodEntry[]>([])
  const [ollamaOk, setOllamaOk] = useState<boolean | null>(null)
  const [foodInput, setFoodInput] = useState('')
  const [mealType, setMealType] = useState<FoodEntry['meal_type']>('snack')
  const [parsing, setParsing] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [showVitals, setShowVitals] = useState(false)
  const [showFood, setShowFood] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [confirmFood, setConfirmFood] = useState<{ open: boolean; id?: string }>({ open: false })
  const dailyQuote = getDailyQuote()
  const debounce = useRef<ReturnType<typeof setTimeout>>(undefined)

  const score = calculateScore(log, food)

  useEffect(() => {
    Promise.all([getLog(TODAY), getFoodEntries(TODAY), isOllamaRunning()])
      .then(([l, f, ollama]) => {
        if (l) setLog({ ...DEFAULT, ...l })
        setFood(f)
        setOllamaOk(ollama)
        setLoaded(true)
      }).catch(() => setLoaded(true))
  }, [])

  const save = useCallback(async (updated: DailyLog) => {
    setSaveStatus('saving')
    if (debounce.current) clearTimeout(debounce.current)
    debounce.current = setTimeout(async () => {
      const sc = calculateScore(updated, food)
      await upsertLog({ ...updated, performance_score: sc })
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 1200)
    }, 500)
  }, [food])

  const update = (patch: Partial<DailyLog>) => {
    const next = { ...log, ...patch }
    setLog(next); save(next)
  }

  const handleAddFood = async () => {
    if (!foodInput.trim()) return
    setParsing(true)
    try {
      const nutrition = await parseFood(foodInput.trim())
      const entry = await addFoodEntry({ date: TODAY, raw_input: foodInput.trim(), meal_type: mealType, ...nutrition })
      setFood(prev => [...prev, entry])
      setFoodInput('')
      toast.success(`${nutrition.food_name} — ${nutrition.calories} kcal`)
    } catch (e) {
      const err = e instanceof Error ? e.message : ''
      if (err === 'no_ai') toast.error('No AI available. Install Ollama or add CalorieNinjas key.')
      else toast.error('Could not parse food')
    } finally { setParsing(false) }
  }

  const handleRemoveFood = async () => {
    if (!confirmFood.id) return
    await deleteFoodEntry(confirmFood.id)
    setFood(prev => prev.filter(e => e.id !== confirmFood.id))
    setConfirmFood({ open: false })
  }

  const foodTotals = food.reduce((a, e) => ({
    cal: a.cal + (e.calories ?? 0), pro: a.pro + (e.protein ?? 0),
    carb: a.carb + (e.carbs ?? 0), fat: a.fat + (e.fat ?? 0),
  }), { cal: 0, pro: 0, carb: 0, fat: 0 })

  if (!loaded) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 12, color: 'var(--text-3)' }}>
      <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid var(--accent)', borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite' }} />
      <span style={{ fontSize: 14 }}>Loading…</span>
    </div>
  )

  const yesterday = format(subDays(new Date(), 1), 'EEEE, MMM d')

  const habitsCompleted = [log.gym_done, log.study_done, log.skincare_am, log.skincare_pm].filter(Boolean).length

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24, maxWidth: 1060, alignItems: 'start' }}>
    <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* ── Header ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <p className="callout">{GREETING}</p>
          <h1 className="title-lg" style={{ marginTop: 2 }}>{format(new Date(), 'EEEE, MMMM d')}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: saveStatus === 'saving' ? 'var(--warning)' : saveStatus === 'saved' ? 'var(--success)' : 'transparent', transition: 'background 0.3s' }} />
              <span className="footnote">
                {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved' : `${score} pts today`}
              </span>
            </div>
            {/* Log yesterday shortcut */}
            <Link href="/history" style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, background: 'var(--bg-2)', border: '1px solid var(--border-2)', textDecoration: 'none', color: 'var(--text-3)', fontSize: 11, fontWeight: 500 }}
              title={`Edit ${yesterday}`}>
              <CalendarDays size={10} />
              Edit {yesterday}
            </Link>
          </div>
        </div>
        <ScoreRing score={score} size={96} />
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'var(--border-2)' }} />

      {/* ── Habits ─────────────────────────────────────────── */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p className="section-label">Habits</p>
        <HabitToggle icon="🏋️" label="Gym" done={log.gym_done} notes={log.gym_notes}
          color="var(--violet)" colorBg="var(--violet-2)" hasNotes points={20}
          notesPlaceholder="What did you train? e.g. Push day, 5k run"
          onToggle={d => { update({ gym_done: d }); logActivity('habit', d ? 'toggled_on' : 'toggled_off', d ? 'Completed Gym' : 'Skipped Gym') }}
          onNotes={n => update({ gym_notes: n })} />
        <HabitToggle icon="📚" label="Study" done={log.study_done} notes={log.study_notes}
          color="var(--cyan)" colorBg="var(--cyan-2)" hasNotes points={20}
          notesPlaceholder="What did you study? e.g. DSA, chapter 5"
          onToggle={d => { update({ study_done: d }); logActivity('habit', d ? 'toggled_on' : 'toggled_off', d ? 'Completed Study' : 'Skipped Study') }}
          onNotes={n => update({ study_notes: n })} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <HabitToggle icon="☀️" label="Skincare AM" done={log.skincare_am}
            color="var(--amber)" colorBg="var(--warning-2)" points={10}
            onToggle={d => { update({ skincare_am: d }); logActivity('habit', d ? 'toggled_on' : 'toggled_off', d ? 'Completed Skincare AM' : 'Skipped Skincare AM') }} />
          <HabitToggle icon="🌙" label="Skincare PM" done={log.skincare_pm}
            color="var(--indigo)" colorBg="var(--indigo-2)" points={10}
            onToggle={d => { update({ skincare_pm: d }); logActivity('habit', d ? 'toggled_on' : 'toggled_off', d ? 'Completed Skincare PM' : 'Skipped Skincare PM') }} />
        </div>
      </section>

      {/* Divider */}
      <div style={{ height: 1, background: 'var(--border-2)' }} />

      {/* ── Vitals ─────────────────────────────────────────── */}
      <section>
        <button
          onClick={() => setShowVitals(v => !v)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'default', padding: 0 }}>
          <p className="section-label">Vitals</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-3)', fontSize: 12 }}>
            <span>💧 {log.water_glasses}/8</span>
            {log.sleep_hours && <span>😴 {log.sleep_hours}h</span>}
            {log.mood && <span>😊 {log.mood}/10</span>}
            {showVitals ? <ChevronUp size={12} strokeWidth={2} /> : <ChevronDown size={12} strokeWidth={2} />}
          </div>
        </button>

        {showVitals && (
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8, animation: 'fade-up 0.2s ease both' }}>
            {/* Water */}
            <div className="card" style={{ padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Droplets size={14} color="var(--cyan)" strokeWidth={1.8} />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Water</span>
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--cyan)' }}>{log.water_glasses}/8 glasses</span>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {Array.from({ length: 10 }, (_, i) => (
                  <button key={i} onClick={() => update({ water_glasses: i < log.water_glasses ? i : i + 1 })}
                    style={{ width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'default', fontSize: 16,
                      background: i < log.water_glasses ? 'var(--cyan-2)' : 'var(--bg-2)',
                      outline: i < log.water_glasses ? '1.5px solid var(--cyan)' : 'none',
                      transition: 'all 0.15s ease' }}>
                    💧
                  </button>
                ))}
              </div>
            </div>

            {/* Sleep */}
            <div className="card" style={{ padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Moon size={14} color="var(--indigo)" strokeWidth={1.8} />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Sleep</span>
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--indigo)' }}>{log.sleep_hours ? `${log.sleep_hours}h` : '—'}</span>
              </div>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {[4, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 10].map(h => (
                  <button key={h} onClick={() => update({ sleep_hours: log.sleep_hours === h ? undefined : h })}
                    style={{ padding: '5px 10px', borderRadius: 7, border: 'none', cursor: 'default', fontSize: 12, fontWeight: 600,
                      background: log.sleep_hours === h ? 'var(--indigo-2)' : 'var(--bg-2)',
                      color: log.sleep_hours === h ? 'var(--indigo)' : 'var(--text-2)',
                      outline: log.sleep_hours === h ? '1.5px solid var(--indigo)' : 'none',
                      transition: 'all 0.15s ease' }}>
                    {h}h
                  </button>
                ))}
              </div>
            </div>

            {/* Mood + Energy */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { key: 'mood' as const, icon: <Smile size={13} strokeWidth={1.8} />, label: 'Mood', color: 'var(--warning)', val: log.mood },
                { key: 'energy' as const, icon: <Zap size={13} strokeWidth={1.8} />, label: 'Energy', color: 'var(--violet)', val: log.energy },
              ].map(({ key, icon, label, color, val }) => (
                <div key={key} className="card" style={{ padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <span style={{ color }}>{icon}</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{label}</span>
                    <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 700, color }}>{val ?? '—'}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {[1,2,3,4,5,6,7,8,9,10].map(n => (
                      <button key={n} onClick={() => update({ [key]: val === n ? undefined : n })}
                        style={{ width: 24, height: 24, borderRadius: 6, border: 'none', cursor: 'default', fontSize: 11, fontWeight: 700,
                          background: val === n ? `color-mix(in srgb, ${color} 15%, transparent)` : 'var(--bg-2)',
                          color: val === n ? color : 'var(--text-3)',
                          outline: val === n ? `1.5px solid ${color}` : 'none',
                          transition: 'all 0.12s ease' }}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Divider */}
      <div style={{ height: 1, background: 'var(--border-2)' }} />

      {/* ── Food ───────────────────────────────────────────── */}
      <section>
        <button
          onClick={() => setShowFood(v => !v)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'default', padding: 0 }}>
          <p className="section-label">Food Log</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-3)', fontSize: 12 }}>
            {food.length > 0 && <span style={{ color: 'var(--success)', fontWeight: 600, fontSize: 11 }}>{Math.round(foodTotals.cal)} kcal</span>}
            {/* AI indicator */}
            <span style={{ fontSize: 10, color: ollamaOk ? 'var(--success)' : 'var(--text-3)', fontWeight: 500 }}>
              {ollamaOk ? '● Ollama' : '○ No AI'}
            </span>
            {showFood ? <ChevronUp size={12} strokeWidth={2} /> : <ChevronDown size={12} strokeWidth={2} />}
          </div>
        </button>

        {showFood && (
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8, animation: 'fade-up 0.2s ease both' }}>
            {/* Macro bar */}
            {food.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                {[
                  { icon: <Flame size={11} />, label: 'kcal', v: Math.round(foodTotals.cal), c: 'var(--warning)' },
                  { icon: <Beef size={11} />, label: 'protein', v: `${Math.round(foodTotals.pro)}g`, c: 'var(--error)' },
                  { icon: <Wheat size={11} />, label: 'carbs', v: `${Math.round(foodTotals.carb)}g`, c: 'var(--amber)' },
                  { icon: <Droplets size={11} />, label: 'fat', v: `${Math.round(foodTotals.fat)}g`, c: 'var(--cyan)' },
                ].map(({ icon, label, v, c }) => (
                  <div key={label} className="card" style={{ padding: '8px 10px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, color: c, marginBottom: 2 }}>
                      {icon}<span style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
                    </div>
                    <p className="tabular-nums" style={{ fontSize: 13, fontWeight: 700 }}>{v}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Food list */}
            {food.map(e => (
              <div key={e.id} className="card" style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{e.food_name ?? e.raw_input}</p>
                  <p className="footnote">{e.calories} kcal · {e.protein}g P · {e.carbs}g C · {e.fat}g F</p>
                </div>
                <button onClick={() => setConfirmFood({ open: true, id: e.id! })} style={{ padding: 5, background: 'none', border: 'none', cursor: 'default', color: 'var(--text-3)', opacity: 0, transition: 'opacity 0.15s' }}
                  onMouseEnter={el => (el.currentTarget.style.opacity = '1')}
                  onMouseLeave={el => (el.currentTarget.style.opacity = '0')}>
                  <X size={13} />
                </button>
              </div>
            ))}

            {/* Ollama not running warning */}
            {ollamaOk === false && (
              <div style={{ padding: '10px 12px', background: 'var(--warning-2)', borderRadius: 'var(--r)', border: '1px solid var(--warning)', fontSize: 12, color: 'var(--warning)' }}>
                💡 Install Ollama for free local AI: <code style={{ fontSize: 11 }}>brew install ollama && ollama pull llama3.2:3b</code>
              </div>
            )}

            {/* Input */}
            <div style={{ display: 'flex', gap: 6 }}>
              <select value={mealType} onChange={e => setMealType(e.target.value as FoodEntry['meal_type'])}
                style={{ padding: '0 10px', borderRadius: 'var(--r)', border: '1px solid var(--border)', fontSize: 12, flexShrink: 0, height: 36, background: 'var(--surface)', color: 'var(--text-1)' }}>
                <option value="breakfast">🌅 Breakfast</option>
                <option value="lunch">☀️ Lunch</option>
                <option value="dinner">🌙 Dinner</option>
                <option value="snack">🍎 Snack</option>
              </select>
              <input
                placeholder="What did you eat? e.g. 2 eggs, oats, chicken"
                value={foodInput} onChange={e => setFoodInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddFood()}
                disabled={parsing}
                style={{ flex: 1, height: 36, borderRadius: 'var(--r)', border: '1px solid var(--border)', padding: '0 12px', fontSize: 13, background: 'var(--surface)', color: 'var(--text-1)' }}
              />
              <button onClick={handleAddFood} disabled={parsing || !foodInput.trim()}
                style={{ width: 36, height: 36, borderRadius: 'var(--r)', background: 'var(--accent)', border: 'none', cursor: 'default', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: (parsing || !foodInput.trim()) ? 0.5 : 1 }}>
                {parsing ? <Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} /> : <Plus size={14} />}
              </button>
            </div>
          </div>
        )}
      </section>

      <ConfirmDialog
        open={confirmFood.open}
        title="Remove food entry?"
        message="This food entry will be removed from today's log."
        confirmLabel="Remove"
        danger
        onConfirm={handleRemoveFood}
        onCancel={() => setConfirmFood({ open: false })}
      />
    </div>

    {/* ── Right panel: motivational quote + daily summary ── */}
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, position: 'sticky', top: 24 }}>
      {/* Quote card */}
      <div className="card" style={{ padding: '20px 20px', position: 'relative', overflow: 'hidden', animation: 'fade-up 0.3s 0.1s ease both' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, var(--violet), var(--cyan))', opacity: 0.7 }} />
        <p style={{ fontSize: 9, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Today's Thought</p>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', top: -6, left: -4, fontSize: 36, color: 'var(--violet)', opacity: 0.15, lineHeight: 1, fontFamily: 'Georgia, serif', userSelect: 'none' }}>"</span>
          <p style={{ fontSize: 13, color: 'var(--text-1)', lineHeight: 1.75, fontStyle: 'italic', paddingLeft: 8 }}>
            {dailyQuote.text}
          </p>
        </div>
        <p style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 12, paddingLeft: 8 }}>{dailyQuote.author}</p>
      </div>

      {/* Habit progress card */}
      <div className="card" style={{ padding: '14px 16px', animation: 'fade-up 0.3s 0.15s ease both' }}>
        <p style={{ fontSize: 9, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Habits Today</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {[
            { label: 'Gym',         done: log.gym_done,     color: 'var(--violet)' },
            { label: 'Study',       done: log.study_done,   color: 'var(--cyan)' },
            { label: 'Skincare AM', done: log.skincare_am,  color: 'var(--amber)' },
            { label: 'Skincare PM', done: log.skincare_pm,  color: 'var(--indigo)' },
          ].map(({ label, done, color }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: done ? color : 'var(--bg-3)', flexShrink: 0, transition: 'background 0.2s', boxShadow: done ? `0 0 6px ${color}80` : 'none' }} />
              <span style={{ fontSize: 12, color: done ? 'var(--text-1)' : 'var(--text-3)', fontWeight: done ? 600 : 400, flex: 1 }}>{label}</span>
              {done && <span style={{ fontSize: 10, color }}>✓</span>}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 12, height: 3, background: 'var(--bg-3)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${habitsCompleted / 4 * 100}%`, background: habitsCompleted === 4 ? 'var(--success)' : 'var(--accent)', borderRadius: 2, transition: 'width 0.6s cubic-bezier(0.34,1.2,0.64,1)' }} />
        </div>
        <p style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 6 }}>{habitsCompleted}/4 complete</p>
      </div>

      {/* Score nudge */}
      {score > 0 && (
        <div className="card" style={{ padding: '12px 16px', animation: 'fade-up 0.3s 0.2s ease both' }}>
          <p style={{ fontSize: 9, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Score</p>
          <p className="tabular-nums" style={{ fontSize: 28, fontWeight: 900, color: score >= 70 ? 'var(--success)' : score >= 40 ? 'var(--warning)' : 'var(--error)' }}>
            {score}<span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-3)' }}>/100</span>
          </p>
          <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
            {score >= 80 ? 'Peak day. Keep it up.' : score >= 60 ? 'Good momentum.' : score >= 40 ? 'Half-way there.' : 'Every point counts.'}
          </p>
        </div>
      )}
    </div>
    </div>
  )
}
