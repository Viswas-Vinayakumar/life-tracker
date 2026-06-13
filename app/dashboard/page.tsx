'use client'

import { useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'
import { Flame, TrendingUp, Target, Trophy } from 'lucide-react'
import type { DailyLog } from '@/types'
import { getScoreColor, getScoreLabel } from '@/lib/scoring'
import { getLogs } from '@/lib/db'

const PIE_COLORS = ['#a78bfa', '#38bdf8', '#34d399', '#fbbf24', '#f87171']

function calcStreak(logs: DailyLog[], key: keyof DailyLog): number {
  let streak = 0
  for (const log of logs) { if (log[key]) streak++; else break }
  return streak
}

function ChartTip({ active, payload, label }: { active?: boolean; payload?: { value: number; name?: string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="card" style={{ padding: '8px 12px', fontSize: 12 }}>
      <p className="footnote" style={{ marginBottom: 4 }}>{label}</p>
      {payload.map((p, i) => <p key={i} style={{ fontWeight: 600 }}>{p.name ? `${p.name}: ` : ''}{p.value}</p>)}
    </div>
  )
}

export default function DashboardPage() {
  const [logs, setLogs] = useState<DailyLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getLogs(30).then(data => { setLogs(data); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 12, color: 'var(--text-3)' }}>
      <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid var(--accent)', borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite' }} />
    </div>
  )

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
    { label: '🏋️ Gym', streak: gymStreak, color: 'var(--violet)' },
    { label: '📚 Study', streak: studyStreak, color: 'var(--cyan)' },
    { label: '☀️ AM Care', streak: skincareAmStreak, color: 'var(--amber)' },
    { label: '🌙 PM Care', streak: skincarePmStreak, color: 'var(--indigo)' },
  ]

  return (
    <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div>
        <h1 className="title-lg">Stats</h1>
        <p className="footnote" style={{ marginTop: 4 }}>Last 30 days · {logs.length} days logged</p>
      </div>

      {/* Top stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        {[
          { icon: <Trophy size={13} />, label: '30-Day Avg', value: avgScore, suffix: '/100', color: getScoreColor(avgScore) },
          { icon: <TrendingUp size={13} />, label: '7-Day Avg', value: last7Avg, suffix: '/100', color: getScoreColor(last7Avg) },
          { icon: <Target size={13} />, label: 'Best', value: bestScore, suffix: '/100', color: 'var(--success)' },
          { icon: <Flame size={13} />, label: 'Days', value: logs.length, suffix: 'd', color: 'var(--warning)' },
        ].map(({ icon, label, value, suffix, color }) => (
          <div key={label} className="card" style={{ padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color, marginBottom: 6 }}>
              {icon}
              <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
            </div>
            <p className="tabular-nums" style={{ fontSize: 20, fontWeight: 700, color }}>
              {value}<span style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 400 }}>{suffix}</span>
            </p>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'var(--border-2)' }} />

      {/* Score chart */}
      <section>
        <p className="section-label">Performance — 30 days</p>
        {chartData.length > 0 ? (
          <div className="card" style={{ padding: '16px 14px 10px' }}>
            <ResponsiveContainer width="100%" height={170}>
              <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
                <defs>
                  <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--violet)" stopOpacity={0.25} />
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

      {/* Streaks */}
      <section>
        <p className="section-label">Streaks</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {streaks.map(({ label, streak, color }) => (
            <div key={label} className="card" style={{ padding: '12px 14px' }}>
              <p style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 6 }}>{label}</p>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3 }}>
                <span className="tabular-nums" style={{ fontSize: 28, fontWeight: 700, color, lineHeight: 1 }}>{streak}</span>
                <span style={{ fontSize: 9, color: 'var(--text-3)', marginBottom: 3 }}>days</span>
              </div>
              <p style={{ fontSize: 10, marginTop: 4, color: streak >= 3 ? color : 'var(--text-3)' }}>
                {streak >= 7 ? '🔥 On fire' : streak >= 3 ? '⚡ Building' : streak > 0 ? 'Keep going' : 'Start today'}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Charts grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {/* Gym vs Study */}
        {chartData.length > 0 && (
          <section>
            <p className="section-label">Gym vs Study</p>
            <div className="card" style={{ padding: '14px 14px 10px' }}>
              <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                {[{ c: 'var(--violet)', l: `Gym (${gymDays}d)` }, { c: 'var(--cyan)', l: `Study (${studyDays}d)` }].map(d => (
                  <div key={d.l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: d.c }} />
                    <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{d.l}</span>
                  </div>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={90}>
                <BarChart data={chartData} margin={{ top: 0, right: 2, bottom: 0, left: -22 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-2)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 8, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <Tooltip content={<ChartTip />} />
                  <Bar dataKey="gym" name="Gym" fill="var(--violet)" radius={[2, 2, 0, 0]} maxBarSize={8} />
                  <Bar dataKey="study" name="Study" fill="var(--cyan)" radius={[2, 2, 0, 0]} maxBarSize={8} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {/* Habit breakdown */}
        {habitPieData.length > 0 && (
          <section>
            <p className="section-label">Habit Breakdown</p>
            <div className="card" style={{ padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <PieChart width={100} height={100}>
                  <Pie data={habitPieData} cx={45} cy={45} innerRadius={26} outerRadius={44} dataKey="value" strokeWidth={0}>
                    {habitPieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                </PieChart>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {habitPieData.map((d, i) => (
                    <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                      <span style={{ fontSize: 11, color: 'var(--text-3)', flex: 1 }}>{d.name}</span>
                      <span style={{ fontSize: 11, fontWeight: 700 }}>{d.value}d</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* Growth level */}
      <section>
        <p className="section-label">Growth Level</p>
        {(() => {
          const total = logs.length * 100
          const earned = logs.reduce((s, l) => s + (l.performance_score ?? 0), 0)
          const pct = total > 0 ? Math.round((earned / total) * 100) : 0
          const level = Math.floor(pct / 10) + 1
          const labels = ['Seedling', 'Rooted', 'Growing', 'Thriving', 'Blooming', 'Flourishing', 'Strong', 'Elite', 'Apex', 'Peak']
          const label = labels[Math.min(level - 1, 9)]
          const color = getScoreColor(pct)
          return (
            <div className="card" style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: 11, color: 'var(--text-3)' }}>Level {level}</p>
                  <p style={{ fontSize: 18, fontWeight: 700, color }}>{label}</p>
                </div>
                <span className="tabular-nums" style={{ fontSize: 22, fontWeight: 800, color }}>{pct}%</span>
              </div>
              <div style={{ height: 6, background: 'var(--bg-3)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 3, background: `linear-gradient(90deg, var(--violet), var(--cyan))`, width: `${(pct % 10) * 10}%`, transition: 'width 1s cubic-bezier(0.34,1.2,0.64,1)' }} />
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-3)' }}>{(level * 10) - pct}% to Level {level + 1}</p>
            </div>
          )
        })()}
      </section>
    </div>
  )
}
