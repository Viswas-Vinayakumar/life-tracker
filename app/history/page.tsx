'use client'

import { useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { Check, X, ChevronDown, ChevronUp } from 'lucide-react'
import { getScoreColor, getScoreLabel } from '@/lib/scoring'
import { getLogs } from '@/lib/db'
import type { DailyLog } from '@/types'

function HabitDot({ done }: { done: boolean }) {
  return (
    <div style={{
      width: 18, height: 18, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: done ? 'color-mix(in srgb, var(--accent) 18%, transparent)' : 'var(--bg-3)',
      transition: 'background 0.15s',
    }}>
      {done
        ? <Check size={9} strokeWidth={3} color="var(--accent)" />
        : <X size={8} strokeWidth={2} color="var(--text-3)" style={{ opacity: 0.3 }} />}
    </div>
  )
}

export default function HistoryPage() {
  const [logs, setLogs] = useState<DailyLog[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    getLogs(90).then(data => { setLogs(data); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 12, color: 'var(--text-3)' }}>
      <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid var(--accent)', borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite' }} />
    </div>
  )

  const sorted = [...logs].sort((a, b) => b.date.localeCompare(a.date))
  const last30 = sorted.slice(0, 30)

  return (
    <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div>
        <h1 className="title-lg">History</h1>
        <p className="footnote" style={{ marginTop: 4 }}>Last 90 days · {logs.length} logged</p>
      </div>

      {/* 30-day habit heatmap */}
      {last30.length > 0 && (
        <section>
          <p className="section-label">30-Day Grid</p>
          <div className="card" style={{ padding: '14px 16px', overflowX: 'auto' }}>
            <div style={{ minWidth: 480 }}>
              <div style={{ display: 'grid', gap: 4, gridTemplateColumns: '72px repeat(30, 1fr)' }}>
                {/* Header */}
                <div />
                {[...last30].reverse().map(l => (
                  <div key={l.date} style={{ textAlign: 'center', fontSize: 8, color: 'var(--text-3)' }}>
                    {format(parseISO(l.date), 'd')}
                  </div>
                ))}

                {/* Rows */}
                {[
                  { key: 'gym_done' as const, label: '🏋️ Gym', color: 'var(--violet)' },
                  { key: 'study_done' as const, label: '📚 Study', color: 'var(--cyan)' },
                  { key: 'skincare_am' as const, label: '☀️ AM', color: 'var(--amber)' },
                  { key: 'skincare_pm' as const, label: '🌙 PM', color: 'var(--indigo)' },
                ].map(({ key, label, color }) => (
                  <>
                    <span key={`label-${key}`} style={{ fontSize: 10, color: 'var(--text-3)', textAlign: 'right', paddingRight: 8, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                      {label}
                    </span>
                    {[...last30].reverse().map(l => (
                      <div key={`${key}-${l.date}`}
                        style={{
                          aspectRatio: '1', borderRadius: 3,
                          background: l[key] ? `color-mix(in srgb, ${color} 60%, transparent)` : 'var(--bg-3)',
                          transition: 'background 0.15s',
                        }}
                        title={`${label}: ${format(parseISO(l.date), 'MMM d')} — ${l[key] ? 'Done' : 'Missed'}`}
                      />
                    ))}
                  </>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Divider */}
      <div style={{ height: 1, background: 'var(--border-2)' }} />

      {/* Log list */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <p className="section-label">All Days</p>
        {sorted.length === 0 ? (
          <div className="card" style={{ padding: '48px 0', textAlign: 'center', color: 'var(--text-3)' }}>
            <p style={{ fontSize: 32, marginBottom: 8 }}>📅</p>
            <p style={{ fontSize: 13 }}>No history yet</p>
          </div>
        ) : sorted.map((log, idx) => {
          const score = log.performance_score ?? 0
          const color = getScoreColor(score)
          const isExpanded = expanded === log.date

          return (
            <div key={log.date} className="card" style={{ overflow: 'hidden', animation: `fade-up 0.15s ${idx * 0.02}s ease both` }}>
              <button
                onClick={() => setExpanded(isExpanded ? null : log.date)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'none', border: 'none', cursor: 'default', textAlign: 'left' }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600 }}>{format(parseISO(log.date), 'EEEE, MMM d')}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 5 }}>
                    <HabitDot done={log.gym_done} />
                    <HabitDot done={log.study_done} />
                    <HabitDot done={log.skincare_am} />
                    <HabitDot done={log.skincare_pm} />
                    <span style={{ fontSize: 10, color: 'var(--text-3)', marginLeft: 3 }}>
                      {[log.gym_done, log.study_done, log.skincare_am, log.skincare_pm].filter(Boolean).length}/4
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ textAlign: 'right' }}>
                    <span className="tabular-nums" style={{ fontSize: 20, fontWeight: 700, color }}>{score}</span>
                    <p style={{ fontSize: 10, fontWeight: 600, color }}>{getScoreLabel(score)}</p>
                  </div>
                  {isExpanded
                    ? <ChevronUp size={12} color="var(--text-3)" />
                    : <ChevronDown size={12} color="var(--text-3)" />}
                </div>
              </button>

              {isExpanded && (
                <div style={{ padding: '0 14px 14px', borderTop: '1px solid var(--border-2)', paddingTop: 12, animation: 'fade-up 0.15s ease both' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, fontSize: 12 }}>
                    {[
                      { label: '🏋️ Gym', value: log.gym_done ? (log.gym_notes || 'Done ✓') : 'Skipped', done: log.gym_done },
                      { label: '📚 Study', value: log.study_done ? (log.study_notes || 'Done ✓') : 'Skipped', done: log.study_done },
                      { label: '💧 Water', value: `${log.water_glasses ?? 0} glasses`, done: (log.water_glasses ?? 0) >= 8 },
                      { label: '😴 Sleep', value: log.sleep_hours ? `${log.sleep_hours}h` : '—', done: !!log.sleep_hours },
                      { label: '😊 Mood', value: log.mood ? `${log.mood}/10` : '—', done: !!log.mood },
                      { label: '⚡ Energy', value: log.energy ? `${log.energy}/10` : '—', done: !!log.energy },
                    ].map(({ label, value, done }) => (
                      <div key={label} style={{
                        padding: '8px 10px', borderRadius: 8,
                        background: done ? 'color-mix(in srgb, var(--accent) 8%, transparent)' : 'var(--bg-2)',
                      }}>
                        <p style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 2 }}>{label}</p>
                        <p style={{ fontSize: 12, fontWeight: 500, color: done ? 'var(--text-1)' : 'var(--text-3)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{value}</p>
                      </div>
                    ))}
                  </div>
                  {log.journal && (
                    <div style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--bg-2)', marginTop: 6 }}>
                      <p style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 3 }}>Journal</p>
                      <p style={{ fontSize: 12 }}>{log.journal}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </section>
    </div>
  )
}
