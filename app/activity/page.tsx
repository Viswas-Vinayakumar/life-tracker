'use client'

import { useState, useEffect } from 'react'
import { format, parseISO, isToday, isYesterday } from 'date-fns'
import { Activity, Dumbbell, Apple, CheckSquare, Wallet, Moon, BookOpen, Clock, History, Plus, Trash2, Check, Pencil, ToggleLeft, ToggleRight, ArrowLeftRight, Brain, Star, Wand2 } from 'lucide-react'
import { getAllActivityLog, type ActivityEntry, type ActivityType, type ActivityAction } from '@/lib/activityLog'
import { learningStats, getLearnedFoods, type LearningStats } from '@/lib/verifiedNutrition'

const ML_COLOR = '#2dd4bf' // teal — distinct from the other categories

const ACTION_META: Record<ActivityAction, { icon: React.ReactNode; color: string; label: string }> = {
  added:       { icon: <Plus size={8} strokeWidth={3} />,         color: 'var(--success)', label: 'C' },
  completed:   { icon: <Check size={8} strokeWidth={3} />,        color: 'var(--cyan)',    label: 'D' },
  deleted:     { icon: <Trash2 size={8} strokeWidth={2.5} />,     color: 'var(--error)',   label: 'D' },
  updated:     { icon: <Pencil size={8} strokeWidth={2.5} />,     color: 'var(--warning)', label: 'U' },
  edited:      { icon: <Pencil size={8} strokeWidth={2.5} />,     color: 'var(--warning)', label: 'U' },
  toggled_on:  { icon: <ToggleRight size={8} strokeWidth={2.5} />,color: 'var(--success)', label: 'U' },
  toggled_off: { icon: <ToggleLeft size={8} strokeWidth={2.5} />, color: 'var(--text-3)',  label: 'U' },
  moved:       { icon: <ArrowLeftRight size={8} strokeWidth={2.5} />, color: 'var(--violet)', label: 'U' },
  rated:       { icon: <Star size={8} strokeWidth={2.5} />,       color: 'var(--warning)', label: 'L' },
  corrected:   { icon: <Wand2 size={8} strokeWidth={2.5} />,      color: ML_COLOR,         label: 'L' },
  learned:     { icon: <Brain size={8} strokeWidth={2.5} />,      color: ML_COLOR,         label: 'L' },
}

const TYPE_META: Record<ActivityType, { icon: React.ReactNode; color: string; label: string }> = {
  habit:        { icon: <Dumbbell size={11} />,    color: 'var(--violet)', label: 'Habit'    },
  food:         { icon: <Apple size={11} />,        color: 'var(--success)', label: 'Food'   },
  todo:         { icon: <CheckSquare size={11} />,  color: 'var(--cyan)',   label: 'Task'     },
  finance:      { icon: <Wallet size={11} />,       color: 'var(--warning)', label: 'Finance' },
  vitals:       { icon: <Moon size={11} />,         color: 'var(--indigo)', label: 'Vitals'  },
  journal:      { icon: <BookOpen size={11} />,     color: 'var(--amber)',  label: 'Journal'  },
  history_edit: { icon: <History size={11} />,      color: 'var(--error)',  label: 'Edit'     },
  ml:           { icon: <Brain size={11} />,        color: ML_COLOR,        label: 'Learning' },
}

function groupByDate(entries: ActivityEntry[]): { dateKey: string; label: string; items: ActivityEntry[] }[] {
  const map: Record<string, ActivityEntry[]> = {}
  for (const e of entries) {
    const d = e.timestamp.slice(0, 10)
    if (!map[d]) map[d] = []
    map[d].push(e)
  }
  return Object.entries(map)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([dateKey, items]) => {
      const d = parseISO(dateKey)
      const label = isToday(d) ? 'Today' : isYesterday(d) ? 'Yesterday' : format(d, 'EEEE, MMM d')
      return { dateKey, label, items }
    })
}

export default function ActivityPage() {
  const [entries, setEntries] = useState<ActivityEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<ActivityType | 'all'>('all')
  const [mlStats, setMlStats] = useState<LearningStats>({ total: 0, trusted: 0, corrected: 0, avgRating: 0 })
  const [learnedFoods, setLearnedFoods] = useState<ReturnType<typeof getLearnedFoods>>([])

  useEffect(() => {
    getAllActivityLog()
      .then(data => { setEntries(data); setLoading(false) })
      .catch(() => setLoading(false))
    setMlStats(learningStats())
    setLearnedFoods(getLearnedFoods())
  }, [])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid var(--accent)', borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite' }} />
    </div>
  )

  const filtered = filter === 'all' ? entries : entries.filter(e => e.type === filter)
  const groups = groupByDate(filtered)

  const types: (ActivityType | 'all')[] = ['all', 'ml', 'habit', 'food', 'todo', 'finance', 'vitals', 'journal', 'history_edit']

  return (
    <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 680 }}>
      {/* Header */}
      <div>
        <h1 className="title-lg">Activity Log</h1>
        <p className="footnote" style={{ marginTop: 4 }}>{entries.length} actions recorded · read-only</p>
      </div>

      {/* Filter chips */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {types.map(t => {
          const meta = t === 'all' ? null : TYPE_META[t]
          const active = filter === t
          return (
            <button key={t} onClick={() => setFilter(t)}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '4px 10px', borderRadius: 20, border: 'none', cursor: 'default', fontSize: 11, fontWeight: 600,
                background: active
                  ? (meta ? `color-mix(in srgb, ${meta.color} 15%, transparent)` : 'var(--accent)')
                  : 'var(--bg-2)',
                color: active ? (meta?.color ?? '#fff') : 'var(--text-3)',
                outline: active ? `1.5px solid ${meta?.color ?? 'var(--accent)'}` : 'none',
                transition: 'all 0.15s',
              }}>
              {meta ? <span style={{ color: meta.color }}>{meta.icon}</span> : <Activity size={11} />}
              {t === 'all' ? 'All' : (meta?.label ?? t)}
            </button>
          )
        })}
      </div>

      {/* Learning / ML summary — what the model has learned from your ratings */}
      {filter === 'ml' && (
        <div className="card" style={{ padding: '16px 18px', position: 'relative', overflow: 'hidden', animation: 'fade-up 0.2s ease both' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${ML_COLOR}, transparent)` }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <div style={{ width: 26, height: 26, borderRadius: 7, background: `color-mix(in srgb, ${ML_COLOR} 14%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Brain size={14} color={ML_COLOR} />
            </div>
            <div>
              <p style={{ fontSize: 12, fontWeight: 700 }}>Model Learning</p>
              <p className="footnote">What the app has learned from your accuracy feedback</p>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: learnedFoods.length ? 14 : 0 }}>
            {[
              { label: 'Foods learned', value: String(mlStats.total) },
              { label: 'Trusted', value: String(mlStats.trusted) },
              { label: 'Corrected', value: String(mlStats.corrected) },
              { label: 'Avg rating', value: mlStats.avgRating ? `${mlStats.avgRating}★` : '—' },
            ].map(s => (
              <div key={s.label} style={{ background: 'var(--bg-2)', borderRadius: 9, padding: '10px 12px' }}>
                <p className="tabular-nums" style={{ fontSize: 20, fontWeight: 900, color: ML_COLOR, letterSpacing: '-0.5px' }}>{s.value}</p>
                <p style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>{s.label}</p>
              </div>
            ))}
          </div>
          {learnedFoods.length > 0 && (
            <div>
              <p style={{ fontSize: 9, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Learned foods</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {learnedFoods.slice(0, 8).map((f, i) => {
                  const c = f.rating >= 4 ? 'var(--success)' : f.rating >= 3 ? 'var(--warning)' : 'var(--error)'
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, background: 'var(--bg-2)' }}>
                      <span style={{ fontSize: 12, fontWeight: 600, flex: 1, minWidth: 0, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{f.food_name}</span>
                      <span className="tabular-nums" style={{ fontSize: 10, color: 'var(--text-3)', flexShrink: 0 }}>{f.calories}kcal · {f.protein}g P</span>
                      {f.corrected && <span style={{ fontSize: 8, fontWeight: 700, color: ML_COLOR, padding: '1px 5px', borderRadius: 5, background: `color-mix(in srgb, ${ML_COLOR} 14%, transparent)`, flexShrink: 0 }}>fixed</span>}
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 10, fontWeight: 800, color: c, flexShrink: 0 }}>
                        <Star size={9} fill={c} color={c} />{f.rating}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Log entries */}
      {groups.length === 0 ? (
        <div className="card" style={{ padding: '48px 0', textAlign: 'center', color: 'var(--text-3)' }}>
          <Clock size={28} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
          <p style={{ fontSize: 13 }}>No activity recorded yet</p>
          <p style={{ fontSize: 12, marginTop: 4 }}>Actions will appear here as you use the app</p>
        </div>
      ) : groups.map(({ dateKey, label, items }) => (
        <section key={dateKey}>
          <p className="section-label" style={{ marginBottom: 6 }}>{label}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {items.map(entry => {
              const meta = TYPE_META[entry.type]
              return (
                <div key={entry.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 14px', borderRadius: 10,
                  background: 'var(--bg-2)',
                  borderLeft: `3px solid ${meta.color}`,
                }}>
                  {/* Type badge */}
                  <div style={{
                    width: 26, height: 26, borderRadius: 7, flexShrink: 0,
                    background: `color-mix(in srgb, ${meta.color} 12%, transparent)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: meta.color,
                  }}>
                    {meta.icon}
                  </div>

                  {/* Description */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-1)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                      {entry.description}
                    </p>
                    <p style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 1 }}>
                      {meta.label} · {entry.action.replace(/_/g, ' ')}
                    </p>
                  </div>

                  {/* Timestamp */}
                  <span className="tabular-nums" style={{ fontSize: 10, color: 'var(--text-3)', flexShrink: 0 }}>
                    {format(parseISO(entry.timestamp), 'HH:mm')}
                  </span>

                  {/* CRUD operation badge — pinned to the right end */}
                  {ACTION_META[entry.action] && (() => {
                    const am = ACTION_META[entry.action]
                    return (
                      <span title={entry.action.replace(/_/g, ' ')} style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                        background: `color-mix(in srgb, ${am.color} 15%, transparent)`,
                        color: am.color,
                      }}>
                        {am.icon}
                      </span>
                    )
                  })()}
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
