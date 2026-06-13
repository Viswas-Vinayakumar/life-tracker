'use client'

import { useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'
import { Flame, TrendingUp, Target, Trophy } from 'lucide-react'
import type { DailyLog } from '@/types'
import { getScoreColor } from '@/lib/scoring'
import { getLogs } from '@/lib/db'
import { Separator } from '@/components/ui/separator'

const PIE_COLORS = ['#a78bfa', '#38bdf8', '#34d399', '#fbbf24', '#f87171']

function calcStreak(logs: DailyLog[], key: keyof DailyLog): number {
  let streak = 0
  for (const log of logs) { if (log[key]) streak++; else break }
  return streak
}

function Tip({ active, payload, label }: { active?: boolean; payload?: { value: number; name?: string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2 text-[12px] shadow-xl">
      <p className="text-muted-foreground mb-1">{label}</p>
      {payload.map((p, i) => <p key={i} className="font-semibold">{p.name ? `${p.name}: ` : ''}{p.value}</p>)}
    </div>
  )
}

export default function DashboardPage() {
  const [logs, setLogs] = useState<DailyLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getLogs(30).then(data => { setLogs(data); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-7 h-7 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  const sorted = [...logs].sort((a, b) => b.date.localeCompare(a.date))
  const last7 = sorted.slice(0, 7).reverse()
  const last30 = sorted.slice(0, 30).reverse()

  const gymStreak = calcStreak(sorted, 'gym_done')
  const studyStreak = calcStreak(sorted, 'study_done')
  const skincareAmStreak = calcStreak(sorted, 'skincare_am')
  const skincarePmStreak = calcStreak(sorted, 'skincare_pm')

  const avgScore = logs.length ? Math.round(logs.reduce((s, l) => s + (l.performance_score ?? 0), 0) / logs.length) : 0
  const last7Avg = last7.length ? Math.round(last7.reduce((s, l) => s + (l.performance_score ?? 0), 0) / last7.length) : 0
  const bestScore = logs.length ? Math.max(...logs.map(l => l.performance_score ?? 0)) : 0

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
    { name: 'AM Care', value: logs.filter(l => l.skincare_am).length },
    { name: 'PM Care', value: logs.filter(l => l.skincare_pm).length },
  ].filter(d => d.value > 0)

  const streaks = [
    { label: '🏋️ Gym', streak: gymStreak, color: '#a78bfa' },
    { label: '📚 Study', streak: studyStreak, color: '#38bdf8' },
    { label: '☀️ Skincare AM', streak: skincareAmStreak, color: '#fbbf24' },
    { label: '🌙 Skincare PM', streak: skincarePmStreak, color: '#818cf8' },
  ]

  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight">Dashboard</h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">Last 30 days · {logs.length} days logged</p>
      </div>

      {/* ─── Stats ─────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { icon: <Trophy size={14} />, label: '30-Day Avg', value: avgScore, suffix: '/100', color: getScoreColor(avgScore) },
          { icon: <TrendingUp size={14} />, label: '7-Day Avg', value: last7Avg, suffix: '/100', color: getScoreColor(last7Avg) },
          { icon: <Target size={14} />, label: 'Best Score', value: bestScore, suffix: '/100', color: '#34d399' },
          { icon: <Flame size={14} />, label: 'Days Logged', value: logs.length, suffix: ' d', color: '#f97316' },
        ].map(({ icon, label, value, suffix, color }) => (
          <div key={label} className="bg-card border border-border rounded-2xl p-4">
            <div className="flex items-center gap-1.5 mb-2" style={{ color }}>
              {icon}
              <span className="text-[10px] font-medium text-muted-foreground">{label}</span>
            </div>
            <p className="text-2xl font-bold tabular-nums" style={{ color }}>
              {value}<span className="text-[11px] text-muted-foreground font-normal">{suffix}</span>
            </p>
          </div>
        ))}
      </div>

      <Separator />

      {/* ─── Score chart ────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Performance — 30 Days</h2>
        {chartData.length > 0 ? (
          <div className="bg-card rounded-2xl p-5 border border-border">
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
                <defs>
                  <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} />
                <Tooltip content={<Tip />} />
                <Area type="monotone" dataKey="score" stroke="#a78bfa" strokeWidth={2} fill="url(#sg)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="bg-card rounded-2xl p-10 border border-border text-center text-muted-foreground text-[13px]">
            No data yet — log your first day!
          </div>
        )}
      </section>

      {/* ─── Streaks ────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Streaks 🔥</h2>
        <div className="grid grid-cols-4 gap-3">
          {streaks.map(({ label, streak, color }) => (
            <div key={label} className="bg-card rounded-2xl p-4 border border-border">
              <p className="text-[11px] text-muted-foreground mb-1.5">{label}</p>
              <div className="flex items-end gap-1">
                <span className="text-3xl font-bold tabular-nums" style={{ color }}>{streak}</span>
                <span className="text-[10px] text-muted-foreground mb-1">days</span>
              </div>
              <p className="text-[10px] mt-1" style={{ color: streak === 0 ? '#64748b' : color }}>
                {streak >= 7 ? '🔥 On fire' : streak >= 3 ? '⚡ Building' : streak > 0 ? 'Keep going' : 'Start today'}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Gym vs Study bars ──────────────────────────── */}
      {chartData.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Gym vs Study — 30 Days</h2>
          <div className="bg-card rounded-2xl p-5 border border-border">
            <div className="flex gap-5 mb-4">
              {[{ color: '#a78bfa', label: `Gym (${gymDays}d)` }, { color: '#38bdf8', label: `Study (${studyDays}d)` }].map(d => (
                <div key={d.label} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ background: d.color }} />
                  <span className="text-[11px] text-muted-foreground">{d.label}</span>
                </div>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={100}>
              <BarChart data={chartData} margin={{ top: 0, right: 4, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#64748b' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <Tooltip content={<Tip />} />
                <Bar dataKey="gym" name="Gym" fill="#a78bfa" radius={[2, 2, 0, 0]} maxBarSize={8} />
                <Bar dataKey="study" name="Study" fill="#38bdf8" radius={[2, 2, 0, 0]} maxBarSize={8} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* ─── Pie + Growth ─────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        {habitPieData.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Habit Breakdown</h2>
            <div className="bg-card rounded-2xl p-4 border border-border">
              <div className="flex items-center gap-3">
                <PieChart width={110} height={110}>
                  <Pie data={habitPieData} cx={50} cy={50} innerRadius={28} outerRadius={48} dataKey="value" strokeWidth={0}>
                    {habitPieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                </PieChart>
                <div className="space-y-1.5">
                  {habitPieData.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-[11px] text-muted-foreground">{d.name}</span>
                      <span className="text-[11px] font-bold ml-auto">{d.value}d</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="space-y-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Growth Level</h2>
          <div className="bg-card rounded-2xl p-4 border border-border h-[calc(100%-28px)]">
            {(() => {
              const total = logs.length * 100
              const earned = logs.reduce((s, l) => s + (l.performance_score ?? 0), 0)
              const pct = total > 0 ? Math.round((earned / total) * 100) : 0
              const level = Math.floor(pct / 10) + 1
              const labels = ['Seedling', 'Rooted', 'Growing', 'Thriving', 'Blooming', 'Flourishing', 'Strong', 'Elite', 'Apex', 'Peak']
              return (
                <div className="h-full flex flex-col justify-center space-y-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-[11px] text-muted-foreground">Level {level}</p>
                      <p className="text-xl font-bold">{labels[Math.min(level - 1, 9)]}</p>
                    </div>
                    <span className="text-[13px] font-semibold text-primary">{pct}%</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-1000"
                      style={{ width: `${(pct % 10) * 10}%`, background: 'linear-gradient(90deg, #a78bfa, #38bdf8)' }} />
                  </div>
                  <p className="text-[11px] text-muted-foreground">{(level * 10) - pct}% to next level</p>
                </div>
              )
            })()}
          </div>
        </section>
      </div>
    </div>
  )
}
