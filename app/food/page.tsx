'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { Flame, Loader2, Plus, Trash2, Apple } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { toast } from 'sonner'
import { getFoodEntries, addFoodEntry, deleteFoodEntry, parseFood } from '@/lib/db'
import { isOllamaRunning } from '@/lib/ollama'
import { logActivity } from '@/lib/activityLog'
import type { FoodEntry } from '@/types'
import ConfirmDialog from '@/components/ui/ConfirmDialog'

const TODAY = format(new Date(), 'yyyy-MM-dd')
const GOALS = { calories: 2200, protein: 150, carbs: 250, fat: 70, fiber: 30 }

const MEAL_GROUPS: { type: FoodEntry['meal_type']; emoji: string; label: string }[] = [
  { type: 'breakfast', emoji: '🌅', label: 'Breakfast' },
  { type: 'lunch',     emoji: '☀️',  label: 'Lunch' },
  { type: 'dinner',   emoji: '🌙',  label: 'Dinner' },
  { type: 'snack',    emoji: '🍎',  label: 'Snacks' },
]

function MacroRing({ value, goal, color, label, unit }: { value: number; goal: number; color: string; label: string; unit: string }) {
  const pct = Math.min(value / goal, 1)
  const size = 64, sw = 6, r = (size - sw) / 2
  const circ = 2 * Math.PI * r
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--bg-3)" strokeWidth={sw} />
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={sw}
            strokeDasharray={`${pct * circ} ${circ}`} strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 1s cubic-bezier(0.34,1.2,0.64,1)' }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span className="tabular-nums" style={{ fontSize: 13, fontWeight: 800, color, lineHeight: 1 }}>{value}</span>
          <span style={{ fontSize: 8, color: 'var(--text-3)' }}>{unit}</span>
        </div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-2)' }}>{label}</p>
        <p style={{ fontSize: 9, color: 'var(--text-3)' }}>{Math.round(pct * 100)}% of {goal}{unit}</p>
      </div>
    </div>
  )
}

function ChartTip({ active, payload }: { active?: boolean; payload?: { name: string; value: number }[] }) {
  if (!active || !payload?.length) return null
  return (
    <div className="card" style={{ padding: '6px 10px', fontSize: 11 }}>
      <p style={{ fontWeight: 600 }}>{payload[0].name}: {payload[0].value}g</p>
    </div>
  )
}

export default function FoodPage() {
  const [food, setFood] = useState<FoodEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [ollamaOk, setOllamaOk] = useState<boolean | null>(null)
  const [input, setInput] = useState('')
  const [mealType, setMealType] = useState<FoodEntry['meal_type']>('snack')
  const [parsing, setParsing] = useState(false)
  const [confirm, setConfirm] = useState<{ open: boolean; entry?: FoodEntry }>({ open: false })

  useEffect(() => {
    Promise.all([getFoodEntries(TODAY), isOllamaRunning()])
      .then(([f, ollama]) => { setFood(f); setOllamaOk(ollama); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const handleAdd = async () => {
    if (!input.trim() || parsing) return
    setParsing(true)
    try {
      const nutrition = await parseFood(input.trim())
      const entry = await addFoodEntry({ date: TODAY, raw_input: input.trim(), meal_type: mealType, ...nutrition })
      setFood(prev => [...prev, entry])
      setInput('')
      await logActivity('food', 'added', `Logged ${nutrition.food_name ?? input.trim()} (${nutrition.calories} kcal)`)
      toast.success(`${nutrition.food_name ?? 'Food'} — ${nutrition.calories} kcal added`)
    } catch (e) {
      const msg = e instanceof Error ? e.message : ''
      if (msg === 'no_ai') toast.error('No AI available. Install Ollama or add a CalorieNinjas key.')
      else toast.error('Could not parse food entry')
    } finally { setParsing(false) }
  }

  const handleDelete = async () => {
    if (!confirm.entry?.id) return
    await deleteFoodEntry(confirm.entry.id)
    await logActivity('food', 'deleted', `Deleted ${confirm.entry.food_name ?? confirm.entry.raw_input}`)
    setFood(prev => prev.filter(e => e.id !== confirm.entry!.id))
    setConfirm({ open: false })
    toast.success('Entry removed')
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid var(--accent)', borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite' }} />
    </div>
  )

  // Totals
  const totals = food.reduce((a, e) => ({
    cal: a.cal + (e.calories ?? 0),
    protein: a.protein + (e.protein ?? 0),
    carbs: a.carbs + (e.carbs ?? 0),
    fat: a.fat + (e.fat ?? 0),
    fiber: a.fiber + (e.fiber ?? 0),
  }), { cal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 })

  const macroRounded = {
    cal: Math.round(totals.cal),
    protein: Math.round(totals.protein),
    carbs: Math.round(totals.carbs),
    fat: Math.round(totals.fat),
    fiber: Math.round(totals.fiber),
  }

  const pieData = [
    { name: 'Protein', value: macroRounded.protein, color: '#a78bfa' },
    { name: 'Carbs',   value: macroRounded.carbs,   color: '#38bdf8' },
    { name: 'Fat',     value: macroRounded.fat,      color: '#fbbf24' },
    { name: 'Fiber',   value: macroRounded.fiber,    color: '#34d399' },
  ].filter(d => d.value > 0)

  const calPct = Math.min(macroRounded.cal / GOALS.calories, 1)
  const calColor = macroRounded.cal > GOALS.calories * 1.15 ? 'var(--error)' : macroRounded.cal > GOALS.calories * 0.9 ? 'var(--success)' : 'var(--warning)'

  return (
    <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 680 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <h1 className="title-lg">Food</h1>
          <p className="footnote" style={{ marginTop: 4 }}>{format(new Date(), 'EEEE, MMMM d')} · {food.length} entries</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 8,
          background: ollamaOk ? 'color-mix(in srgb, var(--success) 10%, transparent)' : 'var(--bg-2)',
          border: `1px solid ${ollamaOk ? 'color-mix(in srgb, var(--success) 30%, transparent)' : 'var(--border-2)'}` }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: ollamaOk ? 'var(--success)' : 'var(--text-3)' }} />
          <span style={{ fontSize: 10, fontWeight: 600, color: ollamaOk ? 'var(--success)' : 'var(--text-3)' }}>
            {ollamaOk ? 'Ollama AI' : 'No AI'}
          </span>
        </div>
      </div>

      {/* ── Log input ── */}
      <div className="card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)' }}>Log what you ate</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={mealType} onChange={e => setMealType(e.target.value as FoodEntry['meal_type'])}
            style={{ height: 38, padding: '0 10px', borderRadius: 9, border: '1px solid var(--border)', fontSize: 13, background: 'var(--bg-2)', color: 'var(--text-1)', flexShrink: 0 }}>
            <option value="breakfast">🌅 Breakfast</option>
            <option value="lunch">☀️ Lunch</option>
            <option value="dinner">🌙 Dinner</option>
            <option value="snack">🍎 Snack</option>
          </select>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="e.g. 2 eggs and toast, chicken rice bowl, protein shake…"
            disabled={parsing}
            style={{ flex: 1, height: 38, borderRadius: 9, border: '1px solid var(--border)', padding: '0 12px', fontSize: 13, background: 'var(--bg-2)', color: 'var(--text-1)' }}
          />
          <button onClick={handleAdd} disabled={parsing || !input.trim()}
            style={{ width: 38, height: 38, borderRadius: 9, background: 'var(--accent)', border: 'none', cursor: 'default', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: (parsing || !input.trim()) ? 0.45 : 1, transition: 'opacity 0.15s' }}>
            {parsing ? <Loader2 size={15} style={{ animation: 'spin 0.7s linear infinite' }} /> : <Plus size={15} />}
          </button>
        </div>
        {ollamaOk === false && (
          <p style={{ fontSize: 11, color: 'var(--text-3)' }}>
            💡 For AI nutrition parsing: <code style={{ fontSize: 10 }}>brew install ollama && ollama pull llama3.2:3b</code>
          </p>
        )}
      </div>

      {/* ── Nutrition dashboard ── */}
      {food.length > 0 && (
        <>
          {/* Calorie bar */}
          <div className="card" style={{ padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Flame size={14} color={calColor} />
                <span style={{ fontSize: 13, fontWeight: 600 }}>Calories Today</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className="tabular-nums" style={{ fontSize: 22, fontWeight: 800, color: calColor }}>{macroRounded.cal.toLocaleString()}</span>
                <span style={{ fontSize: 12, color: 'var(--text-3)' }}> / {GOALS.calories.toLocaleString()} kcal</span>
              </div>
            </div>
            <div style={{ height: 8, background: 'var(--bg-3)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${calPct * 100}%`, background: calColor, borderRadius: 4, transition: 'width 1s cubic-bezier(0.34,1.2,0.64,1)' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
              <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{Math.round(calPct * 100)}% of daily goal</span>
              <span style={{ fontSize: 10, color: 'var(--text-3)' }}>
                {macroRounded.cal < GOALS.calories ? `${GOALS.calories - macroRounded.cal} kcal remaining` : `${macroRounded.cal - GOALS.calories} kcal over`}
              </span>
            </div>
          </div>

          {/* Macro rings + pie */}
          <div className="card" style={{ padding: '16px 18px' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 16 }}>Macros & Nutrients</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {/* Rings */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, flex: 1 }}>
                <MacroRing value={macroRounded.protein} goal={GOALS.protein} color="#a78bfa" label="Protein" unit="g" />
                <MacroRing value={macroRounded.carbs}   goal={GOALS.carbs}   color="#38bdf8" label="Carbs"   unit="g" />
                <MacroRing value={macroRounded.fat}     goal={GOALS.fat}     color="#fbbf24" label="Fat"     unit="g" />
                <MacroRing value={macroRounded.fiber}   goal={GOALS.fiber}   color="#34d399" label="Fiber"   unit="g" />
              </div>
              {/* Pie */}
              {pieData.length > 0 && (
                <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <ResponsiveContainer width={90} height={90}>
                    <PieChart>
                      <Pie data={pieData} cx={40} cy={40} innerRadius={24} outerRadius={42} dataKey="value" strokeWidth={0}>
                        {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Pie>
                      <Tooltip content={<ChartTip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {pieData.map(d => (
                      <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 9, color: 'var(--text-3)' }}>{d.name}</span>
                        <span style={{ fontSize: 9, fontWeight: 700, marginLeft: 'auto', paddingLeft: 6 }}>{d.value}g</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Food entries by meal ── */}
      {MEAL_GROUPS.map(({ type, emoji, label }) => {
        const entries = food.filter(e => e.meal_type === type)
        if (entries.length === 0) return null
        const mealCal = Math.round(entries.reduce((s, e) => s + (e.calories ?? 0), 0))
        return (
          <section key={type}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <p className="section-label">{emoji} {label}</p>
              <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>{mealCal} kcal</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {entries.map(entry => (
                <div key={entry.id} className="card" style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                      {entry.food_name ?? entry.raw_input}
                    </p>
                    <div style={{ display: 'flex', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, color: 'var(--warning)', fontWeight: 600 }}>{entry.calories ?? '?'} kcal</span>
                      {entry.protein != null && <span style={{ fontSize: 11, color: 'var(--text-3)' }}>P {entry.protein}g</span>}
                      {entry.carbs != null   && <span style={{ fontSize: 11, color: 'var(--text-3)' }}>C {entry.carbs}g</span>}
                      {entry.fat != null     && <span style={{ fontSize: 11, color: 'var(--text-3)' }}>F {entry.fat}g</span>}
                      {entry.fiber != null   && <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Fi {entry.fiber}g</span>}
                    </div>
                  </div>
                  {/* Always-visible delete */}
                  <button
                    onClick={() => setConfirm({ open: true, entry })}
                    title="Delete entry"
                    style={{
                      width: 30, height: 30, borderRadius: 7, border: '1px solid var(--border-2)',
                      background: 'none', cursor: 'default', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'var(--error)', flexShrink: 0, transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'color-mix(in srgb, var(--error) 10%, transparent)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )
      })}

      {food.length === 0 && (
        <div className="card" style={{ padding: '48px 0', textAlign: 'center', color: 'var(--text-3)' }}>
          <p style={{ fontSize: 32, marginBottom: 8 }}><Apple size={32} color="var(--text-3)" /></p>
          <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Nothing logged yet</p>
          <p style={{ fontSize: 12 }}>Type what you ate above and press Enter</p>
        </div>
      )}

      <ConfirmDialog
        open={confirm.open}
        title="Remove this entry?"
        message={`Delete "${confirm.entry?.food_name ?? confirm.entry?.raw_input}" from today's log? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setConfirm({ open: false })}
      />
    </div>
  )
}
