'use client'

import { useState, useEffect } from 'react'
import { format, parseISO, isToday, isYesterday } from 'date-fns'
import { Activity, Dumbbell, Apple, CheckSquare, Wallet, Moon, BookOpen, Clock, History, Plus, Trash2, Check, Pencil, ToggleLeft, ToggleRight, ArrowLeftRight } from 'lucide-react'
import { getAllActivityLog, type ActivityEntry, type ActivityType, type ActivityAction } from '@/lib/activityLog'

const ACTION_META: Record<ActivityAction, { icon: React.ReactNode; color: string; label: string }> = {
  added:       { icon: <Plus size={8} strokeWidth={3} />,         color: 'var(--success)', label: 'C' },
  completed:   { icon: <Check size={8} strokeWidth={3} />,        color: 'var(--cyan)',    label: 'D' },
  deleted:     { icon: <Trash2 size={8} strokeWidth={2.5} />,     color: 'var(--error)',   label: 'D' },
  updated:     { icon: <Pencil size={8} strokeWidth={2.5} />,     color: 'var(--warning)', label: 'U' },
  edited:      { icon: <Pencil size={8} strokeWidth={2.5} />,     color: 'var(--warning)', label: 'U' },
  toggled_on:  { icon: <ToggleRight size={8} strokeWidth={2.5} />,color: 'var(--success)', label: 'U' },
  toggled_off: { icon: <ToggleLeft size={8} strokeWidth={2.5} />, color: 'var(--text-3)',  label: 'U' },
  moved:       { icon: <ArrowLeftRight size={8} strokeWidth={2.5} />, color: 'var(--violet)', label: 'U' },
}

const TYPE_META: Record<ActivityType, { icon: React.ReactNode; color: string; label: string }> = {
  habit:        { icon: <Dumbbell size={11} />,    color: 'var(--violet)', label: 'Habit'    },
  food:         { icon: <Apple size={11} />,        color: 'var(--success)', label: 'Food'   },
  todo:         { icon: <CheckSquare size={11} />,  color: 'var(--cyan)',   label: 'Task'     },
  finance:      { icon: <Wallet size={11} />,       color: 'var(--warning)', label: 'Finance' },
  vitals:       { icon: <Moon size={11} />,         color: 'var(--indigo)', label: 'Vitals'  },
  journal:      { icon: <BookOpen size={11} />,     color: 'var(--amber)',  label: 'Journal'  },
  history_edit: { icon: <History size={11} />,      color: 'var(--error)',  label: 'Edit'     },
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

  useEffect(() => {
    getAllActivityLog()
      .then(data => { setEntries(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid var(--accent)', borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite' }} />
    </div>
  )

  const filtered = filter === 'all' ? entries : entries.filter(e => e.type === filter)
  const groups = groupByDate(filtered)

  const types: (ActivityType | 'all')[] = ['all', 'habit', 'food', 'todo', 'finance', 'vitals', 'journal', 'history_edit']

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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-1)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                        {entry.description}
                      </p>
                      {/* CRUD operation badge */}
                      {ACTION_META[entry.action] && (() => {
                        const am = ACTION_META[entry.action]
                        return (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                            background: `color-mix(in srgb, ${am.color} 15%, transparent)`,
                            color: am.color,
                          }}>
                            {am.icon}
                          </span>
                        )
                      })()}
                    </div>
                    <p style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 1 }}>
                      {meta.label} · {entry.action.replace(/_/g, ' ')}
                    </p>
                  </div>

                  {/* Timestamp */}
                  <span className="tabular-nums" style={{ fontSize: 10, color: 'var(--text-3)', flexShrink: 0 }}>
                    {format(parseISO(entry.timestamp), 'HH:mm')}
                  </span>
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
