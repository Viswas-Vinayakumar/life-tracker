'use client'

import { useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { Check, X, ChevronDown, ChevronUp } from 'lucide-react'
import { getScoreColor, getScoreLabel } from '@/lib/scoring'
import type { DailyLog } from '@/types'

function HabitDot({ done }: { done: boolean }) {
  return (
    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${done ? 'bg-primary/20' : 'bg-secondary'}`}>
      {done
        ? <Check size={11} strokeWidth={3} className="text-primary" />
        : <X size={10} strokeWidth={2} className="text-muted-foreground/30" />}
    </div>
  )
}

export default function HistoryPage() {
  const [logs, setLogs] = useState<DailyLog[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/logs?days=90')
      .then(r => r.json())
      .then(data => { setLogs(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  const sorted = [...logs].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div className="px-4 pt-6 pb-8 space-y-5">
      <div>
        <h1 className="text-2xl font-bold">History</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Last 90 days · {logs.length} logged</p>
      </div>

      {/* Heatmap-style habit grid */}
      <div className="bg-card rounded-2xl p-4 border border-border overflow-x-auto">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Habit Grid</p>
        <div className="min-w-[320px]">
          <div className="grid grid-cols-[60px_repeat(30,1fr)] gap-0.5 text-[8px] text-muted-foreground mb-1">
            <div />
            {sorted.slice(0, 30).reverse().map(l => (
              <div key={l.date} className="text-center">{format(parseISO(l.date), 'd')}</div>
            ))}
          </div>
          {[
            { key: 'gym_done' as const, label: '🏋️ Gym' },
            { key: 'study_done' as const, label: '📚 Study' },
            { key: 'skincare_am' as const, label: '☀️ AM' },
            { key: 'skincare_pm' as const, label: '🌙 PM' },
          ].map(({ key, label }) => (
            <div key={key} className="grid grid-cols-[60px_repeat(30,1fr)] gap-0.5 mb-0.5 items-center">
              <span className="text-[9px] text-muted-foreground pr-2 text-right">{label}</span>
              {sorted.slice(0, 30).reverse().map(l => (
                <div key={l.date}
                  className={`w-full aspect-square rounded-sm transition-colors ${
                    l[key] ? 'bg-primary/70' : 'bg-secondary'
                  }`} />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Log list */}
      <div className="space-y-2">
        {sorted.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-4xl mb-3">📅</p>
            <p className="text-sm">No history yet — log your first day!</p>
          </div>
        ) : sorted.map(log => {
          const score = log.performance_score ?? 0
          const color = getScoreColor(score)
          const isExpanded = expanded === log.date

          return (
            <div key={log.date} className="bg-card rounded-2xl border border-border overflow-hidden">
              <button
                onClick={() => setExpanded(isExpanded ? null : log.date)}
                className="w-full flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="text-left">
                    <p className="text-sm font-semibold">{format(parseISO(log.date), 'EEEE, MMM d')}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <HabitDot done={log.gym_done} />
                      <HabitDot done={log.study_done} />
                      <HabitDot done={log.skincare_am} />
                      <HabitDot done={log.skincare_pm} />
                      <span className="text-[10px] text-muted-foreground ml-1">
                        {[log.gym_done, log.study_done, log.skincare_am, log.skincare_pm].filter(Boolean).length}/4 habits
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <span className="text-lg font-bold tabular-nums" style={{ color }}>{score}</span>
                    <p className="text-[10px] font-medium" style={{ color }}>{getScoreLabel(score)}</p>
                  </div>
                  {isExpanded ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 space-y-3 border-t border-border pt-3 slide-up">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[
                      { label: '🏋️ Gym', value: log.gym_done ? (log.gym_notes ?? 'Done ✓') : 'Skipped', done: log.gym_done },
                      { label: '📚 Study', value: log.study_done ? (log.study_notes ?? 'Done ✓') : 'Skipped', done: log.study_done },
                      { label: '💧 Water', value: `${log.water_glasses ?? 0} glasses`, done: (log.water_glasses ?? 0) >= 8 },
                      { label: '😴 Sleep', value: log.sleep_hours ? `${log.sleep_hours}h` : '—', done: !!log.sleep_hours },
                      { label: '😊 Mood', value: log.mood ? `${log.mood}/10` : '—', done: !!log.mood },
                      { label: '⚡ Energy', value: log.energy ? `${log.energy}/10` : '—', done: !!log.energy },
                    ].map(({ label, value, done }) => (
                      <div key={label} className={`rounded-xl p-2.5 ${done ? 'bg-primary/10' : 'bg-secondary'}`}>
                        <p className="text-muted-foreground mb-0.5">{label}</p>
                        <p className={`font-medium truncate ${done ? 'text-foreground' : 'text-muted-foreground'}`}>{value}</p>
                      </div>
                    ))}
                  </div>
                  {log.journal && (
                    <div className="bg-secondary rounded-xl p-3">
                      <p className="text-xs text-muted-foreground mb-1">Journal</p>
                      <p className="text-xs text-foreground">{log.journal}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
