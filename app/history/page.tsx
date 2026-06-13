'use client'

import { useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { Check, X, ChevronDown, ChevronUp } from 'lucide-react'
import { getScoreColor, getScoreLabel } from '@/lib/scoring'
import { getLogs } from '@/lib/db'
import type { DailyLog } from '@/types'
import { Separator } from '@/components/ui/separator'

function HabitDot({ done }: { done: boolean }) {
  return (
    <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${done ? 'bg-primary/20' : 'bg-secondary'}`}>
      {done
        ? <Check size={10} strokeWidth={3} className="text-primary" />
        : <X size={9} strokeWidth={2} className="text-muted-foreground/25" />}
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-7 h-7 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  const sorted = [...logs].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight">History</h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">Last 90 days · {logs.length} logged</p>
      </div>

      {/* Habit heatmap grid */}
      <section className="space-y-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">30-Day Habit Grid</h2>
        <div className="bg-card rounded-2xl p-5 border border-border overflow-x-auto">
          <div className="min-w-[500px]">
            <div className="grid gap-1" style={{ gridTemplateColumns: '80px repeat(30, 1fr)' }}>
              {/* Header row */}
              <div />
              {sorted.slice(0, 30).reverse().map(l => (
                <div key={l.date} className="text-center text-[8px] text-muted-foreground/50">
                  {format(parseISO(l.date), 'd')}
                </div>
              ))}

              {/* Habit rows */}
              {[
                { key: 'gym_done' as const, label: '🏋️ Gym' },
                { key: 'study_done' as const, label: '📚 Study' },
                { key: 'skincare_am' as const, label: '☀️ AM' },
                { key: 'skincare_pm' as const, label: '🌙 PM' },
              ].map(({ key, label }) => (
                <>
                  <span key={`label-${key}`} className="text-[10px] text-muted-foreground text-right pr-2 self-center">{label}</span>
                  {sorted.slice(0, 30).reverse().map(l => (
                    <div key={`${key}-${l.date}`}
                      className={`w-full aspect-square rounded-sm transition-colors ${l[key] ? 'bg-primary/60' : 'bg-secondary/60'}`} />
                  ))}
                </>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Separator />

      {/* Log list */}
      <section className="space-y-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">All Days</h2>
        {sorted.length === 0 ? (
          <div className="bg-card rounded-2xl p-10 border border-border text-center text-muted-foreground">
            <p className="text-3xl mb-3">📅</p>
            <p className="text-[13px]">No history yet</p>
          </div>
        ) : sorted.map(log => {
          const score = log.performance_score ?? 0
          const color = getScoreColor(score)
          const isExpanded = expanded === log.date

          return (
            <div key={log.date} className="bg-card rounded-2xl border border-border overflow-hidden">
              <button
                onClick={() => setExpanded(isExpanded ? null : log.date)}
                className="w-full flex items-center justify-between px-4 py-3.5 transition-colors hover:bg-white/2">
                <div className="flex items-center gap-3">
                  <div className="text-left">
                    <p className="text-[13px] font-semibold">{format(parseISO(log.date), 'EEEE, MMM d')}</p>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <HabitDot done={log.gym_done} />
                      <HabitDot done={log.study_done} />
                      <HabitDot done={log.skincare_am} />
                      <HabitDot done={log.skincare_pm} />
                      <span className="text-[10px] text-muted-foreground ml-1">
                        {[log.gym_done, log.study_done, log.skincare_am, log.skincare_pm].filter(Boolean).length}/4
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-xl font-bold tabular-nums" style={{ color }}>{score}</span>
                    <p className="text-[10px] font-medium" style={{ color }}>{getScoreLabel(score)}</p>
                  </div>
                  {isExpanded ? <ChevronUp size={13} className="text-muted-foreground" /> : <ChevronDown size={13} className="text-muted-foreground" />}
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 border-t border-border pt-3 slide-up">
                  <div className="grid grid-cols-3 gap-2 text-[12px]">
                    {[
                      { label: '🏋️ Gym', value: log.gym_done ? (log.gym_notes || 'Done ✓') : 'Skipped', done: log.gym_done },
                      { label: '📚 Study', value: log.study_done ? (log.study_notes || 'Done ✓') : 'Skipped', done: log.study_done },
                      { label: '💧 Water', value: `${log.water_glasses ?? 0} glasses`, done: (log.water_glasses ?? 0) >= 8 },
                      { label: '😴 Sleep', value: log.sleep_hours ? `${log.sleep_hours}h` : '—', done: !!log.sleep_hours },
                      { label: '😊 Mood', value: log.mood ? `${log.mood}/10` : '—', done: !!log.mood },
                      { label: '⚡ Energy', value: log.energy ? `${log.energy}/10` : '—', done: !!log.energy },
                    ].map(({ label, value, done }) => (
                      <div key={label} className={`rounded-xl p-2.5 ${done ? 'bg-primary/8' : 'bg-secondary/50'}`}>
                        <p className="text-muted-foreground text-[10px] mb-0.5">{label}</p>
                        <p className={`font-medium truncate text-[12px] ${done ? 'text-foreground' : 'text-muted-foreground'}`}>{value}</p>
                      </div>
                    ))}
                  </div>
                  {log.journal && (
                    <div className="bg-secondary/50 rounded-xl p-3 mt-2">
                      <p className="text-[10px] text-muted-foreground mb-1">Journal</p>
                      <p className="text-[12px] text-foreground">{log.journal}</p>
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
