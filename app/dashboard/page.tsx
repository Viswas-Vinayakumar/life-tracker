'use client'

import { useState, useEffect } from 'react'
import { format, subDays, parseISO } from 'date-fns'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'
import { Flame, TrendingUp, Target, Trophy } from 'lucide-react'
import type { DailyLog } from '@/types'
import { getScoreColor } from '@/lib/scoring'
import { Separator } from '@/components/ui/separator'

const PIE_COLORS = ['#7c3aed', '#06b6d4', '#f59e0b', '#22c55e', '#ef4444']

function calcStreak(logs: DailyLog[], key: keyof DailyLog): number {
  let streak = 0
  for (const log of logs) {
    if (log[key]) streak++
    else break
  }
  return streak
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: {value: number}[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2 text-xs">
      <p className="text-muted-foreground">{label}</p>
      <p className="font-bold text-foreground">{payload[0]?.value}</p>
    </div>
  )
}

export default function DashboardPage() {
  const [logs, setLogs] = useState<DailyLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/logs?days=30')
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
  const last7 = sorted.slice(0, 7).reverse()
  const last30 = sorted.slice(0, 30).reverse()

  const gymStreak = calcStreak(sorted, 'gym_done')
  const studyStreak = calcStreak(sorted, 'study_done')
  const skincareAmStreak = calcStreak(sorted, 'skincare_am')
  const skincarepmStreak = calcStreak(sorted, 'skincare_pm')

  const avgScore = logs.length
    ? Math.round(logs.reduce((s, l) => s + (l.performance_score ?? 0), 0) / logs.length)
    : 0

  const gymDays = logs.filter(l => l.gym_done).length
  const studyDays = logs.filter(l => l.study_done).length

  const chartData = last30.map(l => ({
    date: format(parseISO(l.date), 'MMM d'),
    score: l.performance_score ?? 0,
    gym: l.gym_done ? 1 : 0,
    study: l.study_done ? 1 : 0,
  }))

  const habitPieData = [
    { name: 'Gym', value: gymDays },
    { name: 'Study', value: studyDays },
    { name: 'Skincare AM', value: logs.filter(l => l.skincare_am).length },
    { name: 'Skincare PM', value: logs.filter(l => l.skincare_pm).length },
  ].filter(d => d.value > 0)

  const streaks = [
    { label: '🏋️ Gym', streak: gymStreak, color: '#7c3aed' },
    { label: '📚 Study', streak: studyStreak, color: '#06b6d4' },
    { label: '☀️ Skincare AM', streak: skincareAmStreak, color: '#f59e0b' },
    { label: '🌙 Skincare PM', streak: skincarepmStreak, color: '#8b5cf6' },
  ]

  const bestScore = logs.length ? Math.max(...logs.map(l => l.performance_score ?? 0)) : 0
  const last7Avg = last7.length
    ? Math.round(last7.reduce((s, l) => s + (l.performance_score ?? 0), 0) / last7.length)
    : 0

  return (
    <div className="px-4 pt-6 pb-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Last 30 days overview</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: <Trophy size={16} />, label: 'Avg Score', value: avgScore, suffix: '/100', color: getScoreColor(avgScore) },
          { icon: <TrendingUp size={16} />, label: '7-Day Avg', value: last7Avg, suffix: '/100', color: getScoreColor(last7Avg) },
          { icon: <Target size={16} />, label: 'Best Score', value: bestScore, suffix: '/100', color: '#22c55e' },
          { icon: <Flame size={16} />, label: 'Days Logged', value: logs.length, suffix: ' days', color: '#f97316' },
        ].map(({ icon, label, value, suffix, color }) => (
          <div key={label} className="bg-card rounded-2xl p-4 border border-border">
            <div className="flex items-center gap-1.5 mb-2" style={{ color }}>
              {icon}
              <span className="text-xs font-medium text-muted-foreground">{label}</span>
            </div>
            <p className="text-2xl font-bold tabular-nums" style={{ color }}>
              {value}<span className="text-xs text-muted-foreground font-normal">{suffix}</span>
            </p>
          </div>
        ))}
      </div>

      <Separator className="bg-border" />

      {/* Performance chart */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold">Performance Score — 30 Days</h2>
        {chartData.length > 0 ? (
          <div className="bg-card rounded-2xl p-4 border border-border">
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#64748b' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#64748b' }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="score" stroke="#7c3aed" strokeWidth={2} fill="url(#scoreGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="bg-card rounded-2xl p-8 border border-border text-center text-muted-foreground text-sm">
            No data yet — start logging!
          </div>
        )}
      </section>

      {/* Streaks */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold">Current Streaks 🔥</h2>
        <div className="grid grid-cols-2 gap-3">
          {streaks.map(({ label, streak, color }) => (
            <div key={label} className="bg-card rounded-2xl p-4 border border-border">
              <p className="text-xs text-muted-foreground mb-1">{label}</p>
              <div className="flex items-end gap-1">
                <span className="text-3xl font-bold tabular-nums" style={{ color }}>{streak}</span>
                <span className="text-xs text-muted-foreground mb-1">days</span>
              </div>
              {streak >= 7 && <p className="text-xs mt-1" style={{ color }}>🔥 On fire!</p>}
              {streak === 0 && <p className="text-xs text-muted-foreground mt-1">Start today</p>}
            </div>
          ))}
        </div>
      </section>

      {/* Habit frequency bar chart */}
      {chartData.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-bold">Gym vs Study — 30 Days</h2>
          <div className="bg-card rounded-2xl p-4 border border-border">
            <div className="flex gap-4 mb-3">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-violet-500" />
                <span className="text-xs text-muted-foreground">Gym ({gymDays}d)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-cyan-500" />
                <span className="text-xs text-muted-foreground">Study ({studyDays}d)</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={chartData} margin={{ top: 0, right: 4, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#64748b' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="gym" fill="#7c3aed" radius={[2, 2, 0, 0]} maxBarSize={8} />
                <Bar dataKey="study" fill="#06b6d4" radius={[2, 2, 0, 0]} maxBarSize={8} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* Habit pie */}
      {habitPieData.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-bold">Habit Breakdown</h2>
          <div className="bg-card rounded-2xl p-4 border border-border flex items-center">
            <ResponsiveContainer width="50%" height={140}>
              <PieChart>
                <Pie data={habitPieData} cx="50%" cy="50%" innerRadius={35} outerRadius={55}
                  dataKey="value" strokeWidth={0}>
                  {habitPieData.map((_, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-2">
              {habitPieData.map((d, i) => (
                <div key={d.name} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="text-xs text-muted-foreground">{d.name}</span>
                  <span className="text-xs font-bold ml-auto">{d.value}d</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Growth bar */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold">Growth Level</h2>
        <div className="bg-card rounded-2xl p-4 border border-border">
          {(() => {
            const total = logs.length * 100
            const earned = logs.reduce((s, l) => s + (l.performance_score ?? 0), 0)
            const pct = total > 0 ? Math.round((earned / total) * 100) : 0
            const level = Math.floor(pct / 10) + 1
            const nextPct = ((level) * 10)
            return (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold">Level {level}</span>
                  <span className="text-xs text-muted-foreground">{pct}% efficiency</span>
                </div>
                <div className="h-3 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{
                      width: `${pct % 10 * 10}%`,
                      background: 'linear-gradient(90deg, #7c3aed, #06b6d4)'
                    }} />
                </div>
                <p className="text-xs text-muted-foreground">{nextPct - pct}% to next level</p>
              </div>
            )
          })()}
        </div>
      </section>
    </div>
  )
}
