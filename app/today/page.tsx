'use client'

import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { Droplets, Moon, Zap, Smile, ChevronDown, ChevronUp, Check, BookOpen } from 'lucide-react'
import { toast } from 'sonner'
import HabitToggle from '@/components/habits/HabitToggle'
import ScoreRing from '@/components/habits/ScoreRing'
import FoodLogger from '@/components/food/FoodLogger'
import FinanceWidget from '@/components/finance/FinanceWidget'
import { Separator } from '@/components/ui/separator'
import { calculateScore } from '@/lib/scoring'
import type { DailyLog, FoodEntry, FinancialEntry } from '@/types'

const today = format(new Date(), 'yyyy-MM-dd')
const hour = new Date().getHours()
const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening'
const greetingEmoji = hour < 12 ? '🌅' : hour < 17 ? '☀️' : '🌙'

const defaultLog: DailyLog = {
  date: today,
  gym_done: false,
  gym_notes: '',
  study_done: false,
  study_notes: '',
  skincare_am: false,
  skincare_pm: false,
  water_glasses: 0,
  sleep_hours: undefined,
  mood: undefined,
  energy: undefined,
}

export default function TodayPage() {
  const [log, setLog] = useState<DailyLog>(defaultLog)
  const [foodEntries, setFoodEntries] = useState<FoodEntry[]>([])
  const [financeEntries, setFinanceEntries] = useState<FinancialEntry[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [expandVitals, setExpandVitals] = useState(false)
  const [journalOpen, setJournalOpen] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const score = calculateScore(log, foodEntries)

  useEffect(() => {
    Promise.all([
      fetch(`/api/logs?days=1`).then(r => r.json()),
      fetch(`/api/food?date=${today}`).then(r => r.json()),
      fetch(`/api/finance?days=0`).then(r => r.json()),
    ]).then(([logs, food, finance]) => {
      const todayLog = Array.isArray(logs) ? logs.find((l: DailyLog) => l.date === today) : null
      if (todayLog) setLog({ ...defaultLog, ...todayLog })
      if (Array.isArray(food)) setFoodEntries(food)
      if (Array.isArray(finance)) setFinanceEntries(finance.filter((e: FinancialEntry) => e.date === today))
      setLoaded(true)
    }).catch(() => setLoaded(true))
  }, [])

  const saveLog = useCallback(async (updated: DailyLog) => {
    setSaving(true)
    try {
      const sc = calculateScore(updated, foodEntries)
      await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...updated, performance_score: sc }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      toast.error('Save failed')
    } finally {
      setSaving(false)
    }
  }, [foodEntries])

  const update = (partial: Partial<DailyLog>) => {
    const next = { ...log, ...partial }
    setLog(next)
    saveLog(next)
  }

  if (!loaded) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Loading your day...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 pt-6 pb-8 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-muted-foreground text-sm font-medium">
            {greetingEmoji} {greeting}
          </p>
          <h1 className="text-2xl font-bold mt-0.5">
            {format(new Date(), 'EEEE, MMM d')}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {saving ? 'Saving...' : saved ? '✓ Saved' : 'Tap habits to log your day'}
          </p>
        </div>
        <ScoreRing score={score} size={90} />
      </div>

      <Separator className="bg-border" />

      {/* HABITS */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">
          Habits
        </h2>
        <HabitToggle
          icon="🏋️"
          label="Gym"
          done={log.gym_done}
          notes={log.gym_notes}
          color="#7c3aed"
          hasNotes
          notesPlaceholder="What did you train? (e.g. chest + triceps, 5km run)"
          onToggle={(done) => update({ gym_done: done })}
          onNotes={(notes) => update({ gym_notes: notes })}
          points={25}
        />
        <HabitToggle
          icon="📚"
          label="Study"
          done={log.study_done}
          notes={log.study_notes}
          color="#06b6d4"
          hasNotes
          notesPlaceholder="What did you study? (e.g. React, chapter 5, algorithms)"
          onToggle={(done) => update({ study_done: done })}
          onNotes={(notes) => update({ study_notes: notes })}
          points={25}
        />
        <div className="grid grid-cols-2 gap-3">
          <HabitToggle
            icon="☀️"
            label="Skincare AM"
            done={log.skincare_am}
            color="#f59e0b"
            onToggle={(done) => update({ skincare_am: done })}
            points={10}
          />
          <HabitToggle
            icon="🌙"
            label="Skincare PM"
            done={log.skincare_pm}
            color="#8b5cf6"
            onToggle={(done) => update({ skincare_pm: done })}
            points={10}
          />
        </div>
      </section>

      <Separator className="bg-border" />

      {/* VITALS - Water, Sleep, Mood */}
      <section className="space-y-3">
        <button
          onClick={() => setExpandVitals(!expandVitals)}
          className="w-full flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Vitals
          </h2>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>💧 {log.water_glasses}/8</span>
              {log.sleep_hours && <span>😴 {log.sleep_hours}h</span>}
              {log.mood && <span>😊 {log.mood}/10</span>}
            </div>
            {expandVitals ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
          </div>
        </button>

        {expandVitals && (
          <div className="space-y-4 slide-up">
            {/* Water */}
            <div className="bg-card rounded-2xl p-4 border border-border">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Droplets size={16} className="text-cyan-400" />
                  <span className="text-sm font-semibold">Water</span>
                </div>
                <span className="text-sm font-bold text-cyan-400 tabular-nums">{log.water_glasses} / 8 glasses</span>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {Array.from({ length: 10 }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => update({ water_glasses: i === log.water_glasses - 1 ? log.water_glasses - 1 : i + 1 })}
                    className={`w-8 h-8 rounded-lg text-sm transition-all duration-200 active:scale-90
                      ${i < log.water_glasses
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                        : 'bg-secondary text-muted-foreground border border-transparent'}`}>
                    💧
                  </button>
                ))}
              </div>
            </div>

            {/* Sleep */}
            <div className="bg-card rounded-2xl p-4 border border-border">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Moon size={16} className="text-indigo-400" />
                  <span className="text-sm font-semibold">Sleep</span>
                </div>
                <span className="text-sm font-bold text-indigo-400">
                  {log.sleep_hours ? `${log.sleep_hours}h` : '—'}
                </span>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {[4, 5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 10].map(h => (
                  <button
                    key={h}
                    onClick={() => update({ sleep_hours: log.sleep_hours === h ? undefined : h })}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 active:scale-90
                      ${log.sleep_hours === h
                        ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/40'
                        : 'bg-secondary text-muted-foreground border border-transparent'}`}>
                    {h}h
                  </button>
                ))}
              </div>
            </div>

            {/* Mood & Energy */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'mood' as const, icon: <Smile size={14} className="text-yellow-400" />, label: 'Mood', color: 'yellow', value: log.mood },
                { key: 'energy' as const, icon: <Zap size={14} className="text-orange-400" />, label: 'Energy', color: 'orange', value: log.energy },
              ].map(({ key, icon, label, color, value }) => (
                <div key={key} className="bg-card rounded-2xl p-3 border border-border">
                  <div className="flex items-center gap-1.5 mb-2">
                    {icon}
                    <span className="text-xs font-semibold">{label}</span>
                    <span className={`ml-auto text-xs font-bold text-${color}-400`}>{value ?? '—'}</span>
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                      <button
                        key={n}
                        onClick={() => update({ [key]: value === n ? undefined : n })}
                        className={`w-7 h-7 rounded-lg text-xs font-medium transition-all active:scale-90
                          ${value === n
                            ? `bg-${color}-500/20 text-${color}-400 border border-${color}-500/40`
                            : 'bg-secondary text-muted-foreground'}`}>
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

      <Separator className="bg-border" />

      {/* FOOD */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">
          🍽️ Food Log
        </h2>
        <FoodLogger
          date={today}
          entries={foodEntries}
          onAdd={(e) => setFoodEntries(prev => [...prev, e])}
          onRemove={(id) => setFoodEntries(prev => prev.filter(e => e.id !== id))}
        />
      </section>

      <Separator className="bg-border" />

      {/* FINANCE */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">
          💰 Finance
        </h2>
        <FinanceWidget
          date={today}
          entries={financeEntries}
          onAdd={(e) => setFinanceEntries(prev => [...prev, e])}
          onRemove={(id) => setFinanceEntries(prev => prev.filter(e => e.id !== id))}
        />
      </section>

      <Separator className="bg-border" />

      {/* JOURNAL */}
      <section className="space-y-3">
        <button
          onClick={() => setJournalOpen(!journalOpen)}
          className="w-full flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            <BookOpen size={12} className="inline mr-1.5" />
            Journal
          </h2>
          <span className="text-xs text-muted-foreground">
            {log.journal ? `${log.journal.length} chars` : 'Optional'}
          </span>
        </button>
        {journalOpen && (
          <textarea
            placeholder="Reflect on your day... what went well, what could be better?"
            value={log.journal ?? ''}
            onChange={(e) => update({ journal: e.target.value })}
            className="w-full min-h-[100px] rounded-2xl bg-card border border-border px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:border-primary/50 transition-colors slide-up"
          />
        )}
      </section>

      {/* Done CTA */}
      <div className="pt-2">
        <div className={`flex items-center justify-center gap-2 p-4 rounded-2xl border transition-all duration-500
          ${score >= 80
            ? 'bg-green-500/10 border-green-500/30 text-green-400'
            : score >= 60
            ? 'bg-primary/10 border-primary/30 text-primary'
            : 'bg-card border-border text-muted-foreground'}`}>
          <Check size={18} />
          <span className="font-semibold">
            {score >= 80 ? '🔥 Crushing it today!' : score >= 60 ? '💪 Good progress!' : `Score: ${score}/100 — keep going!`}
          </span>
        </div>
      </div>
    </div>
  )
}
