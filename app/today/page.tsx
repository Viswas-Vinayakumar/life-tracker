'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { format } from 'date-fns'
import { Droplets, Moon, Zap, Smile, Check, BookOpen, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'
import HabitToggle from '@/components/habits/HabitToggle'
import ScoreRing from '@/components/habits/ScoreRing'
import FoodLogger from '@/components/food/FoodLogger'
import FinanceWidget from '@/components/finance/FinanceWidget'
import { Separator } from '@/components/ui/separator'
import { calculateScore } from '@/lib/scoring'
import { getLog, upsertLog, getFoodEntries, getFinanceEntries } from '@/lib/db'
import type { DailyLog, FoodEntry, FinancialEntry } from '@/types'

const today = format(new Date(), 'yyyy-MM-dd')
const todayMonth = format(new Date(), 'yyyy-MM')
const hour = new Date().getHours()
const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening'

const defaultLog: DailyLog = {
  date: today,
  gym_done: false, gym_notes: '',
  study_done: false, study_notes: '',
  skincare_am: false, skincare_pm: false,
  water_glasses: 0,
}

export default function TodayPage() {
  const [log, setLog] = useState<DailyLog>(defaultLog)
  const [foodEntries, setFoodEntries] = useState<FoodEntry[]>([])
  const [financeEntries, setFinanceEntries] = useState<FinancialEntry[]>([])
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [expandVitals, setExpandVitals] = useState(false)
  const [journalOpen, setJournalOpen] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const score = calculateScore(log, foodEntries)

  useEffect(() => {
    Promise.all([
      getLog(today),
      getFoodEntries(today),
      getFinanceEntries(todayMonth),
    ]).then(([logData, food, finance]) => {
      if (logData) setLog({ ...defaultLog, ...logData })
      setFoodEntries(food)
      setFinanceEntries(finance.filter(e => e.date === today))
      setLoaded(true)
    }).catch(() => setLoaded(true))
  }, [])

  const saveLog = useCallback(async (updated: DailyLog) => {
    setSaveStatus('saving')
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      try {
        const sc = calculateScore(updated, foodEntries)
        await upsertLog({ ...updated, performance_score: sc })
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 1500)
      } catch { toast.error('Save failed') }
    }, 400)
  }, [foodEntries])

  const update = (partial: Partial<DailyLog>) => {
    const next = { ...log, ...partial }
    setLog(next)
    saveLog(next)
  }

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-7 h-7 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  const habitsComplete = [log.gym_done, log.study_done, log.skincare_am, log.skincare_pm].filter(Boolean).length

  return (
    <div className="space-y-7 pt-0 md:pt-2">
      {/* ─── Header ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground font-medium">{greeting}</p>
          <h1 className="text-[26px] font-semibold tracking-tight mt-0.5 text-foreground">
            {format(new Date(), 'EEEE, MMMM d')}
          </h1>
          <div className="flex items-center gap-2 mt-1.5">
            <div className={`h-1.5 w-1.5 rounded-full transition-colors ${
              saveStatus === 'saving' ? 'bg-yellow-400 animate-pulse' :
              saveStatus === 'saved' ? 'bg-green-400' : 'bg-transparent'
            }`} />
            <p className="text-[12px] text-muted-foreground">
              {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved' : `${habitsComplete}/4 habits · ${score} pts`}
            </p>
          </div>
        </div>
        <ScoreRing score={score} size={100} />
      </div>

      <Separator />

      {/* ─── Habits ─────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Habits
        </h2>

        {/* Gym + Study: full width */}
        <div className="space-y-2.5">
          <HabitToggle
            icon="🏋️" label="Gym" done={log.gym_done} notes={log.gym_notes}
            color="#a78bfa" hasNotes notesPlaceholder="What did you train? e.g. Push day, 5k run"
            onToggle={(done) => update({ gym_done: done })}
            onNotes={(notes) => update({ gym_notes: notes })} points={20}
          />
          <HabitToggle
            icon="📚" label="Study" done={log.study_done} notes={log.study_notes}
            color="#38bdf8" hasNotes notesPlaceholder="What did you study? e.g. DSA, System Design"
            onToggle={(done) => update({ study_done: done })}
            onNotes={(notes) => update({ study_notes: notes })} points={20}
          />
        </div>

        {/* Skincare: side by side */}
        <div className="grid grid-cols-2 gap-2.5">
          <HabitToggle icon="☀️" label="Skincare AM" done={log.skincare_am}
            color="#fbbf24" onToggle={(done) => update({ skincare_am: done })} points={10} />
          <HabitToggle icon="🌙" label="Skincare PM" done={log.skincare_pm}
            color="#818cf8" onToggle={(done) => update({ skincare_pm: done })} points={10} />
        </div>
      </section>

      <Separator />

      {/* ─── Vitals ─────────────────────────────────────────────── */}
      <section className="space-y-3">
        <button onClick={() => setExpandVitals(v => !v)}
          className="w-full flex items-center justify-between group">
          <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Vitals</h2>
          <div className="flex items-center gap-3 text-[12px] text-muted-foreground">
            <span>💧 {log.water_glasses}/8</span>
            {log.sleep_hours && <span>😴 {log.sleep_hours}h</span>}
            {log.mood && <span>😊 {log.mood}/10</span>}
            {expandVitals ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </div>
        </button>

        {expandVitals && (
          <div className="space-y-3 slide-up">
            {/* Water */}
            <div className="bg-card border border-border rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Droplets size={14} className="text-sky-400" />
                  <span className="text-[13px] font-medium">Water</span>
                </div>
                <span className="text-[13px] font-semibold text-sky-400 tabular-nums">{log.water_glasses} / 8</span>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {Array.from({ length: 10 }, (_, i) => (
                  <button key={i}
                    onClick={() => update({ water_glasses: i < log.water_glasses ? i : i + 1 })}
                    className={`w-8 h-8 rounded-xl text-sm transition-all duration-150 active:scale-90
                      ${i < log.water_glasses
                        ? 'bg-sky-500/20 border border-sky-400/40'
                        : 'bg-secondary border border-transparent text-muted-foreground/40'}`}>
                    💧
                  </button>
                ))}
              </div>
            </div>

            {/* Sleep */}
            <div className="bg-card border border-border rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Moon size={14} className="text-indigo-400" />
                  <span className="text-[13px] font-medium">Sleep</span>
                </div>
                <span className="text-[13px] font-semibold text-indigo-400">
                  {log.sleep_hours ? `${log.sleep_hours}h` : '—'}
                </span>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {[4, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 10].map(h => (
                  <button key={h}
                    onClick={() => update({ sleep_hours: log.sleep_hours === h ? undefined : h })}
                    className={`px-3 py-1.5 rounded-xl text-[12px] font-medium transition-all active:scale-90
                      ${log.sleep_hours === h
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-400/40'
                        : 'bg-secondary text-muted-foreground'}`}>
                    {h}h
                  </button>
                ))}
              </div>
            </div>

            {/* Mood + Energy */}
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { key: 'mood' as const, icon: <Smile size={13} className="text-yellow-400" />, label: 'Mood', val: log.mood, color: 'yellow' },
                { key: 'energy' as const, icon: <Zap size={13} className="text-orange-400" />, label: 'Energy', val: log.energy, color: 'orange' },
              ].map(({ key, icon, label, val, color }) => (
                <div key={key} className="bg-card border border-border rounded-2xl p-3">
                  <div className="flex items-center gap-1.5 mb-2.5">
                    {icon}
                    <span className="text-[12px] font-medium">{label}</span>
                    <span className={`ml-auto text-[12px] font-semibold text-${color}-400`}>{val ?? '—'}</span>
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    {[1,2,3,4,5,6,7,8,9,10].map(n => (
                      <button key={n}
                        onClick={() => update({ [key]: val === n ? undefined : n })}
                        className={`w-6 h-6 rounded-lg text-[11px] font-medium transition-all active:scale-90
                          ${val === n ? `bg-${color}-500/20 text-${color}-300 border border-${color}-400/40` : 'bg-secondary text-muted-foreground'}`}>
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

      <Separator />

      {/* ─── Food ───────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Food Log
        </h2>
        <FoodLogger
          date={today}
          entries={foodEntries}
          onAdd={(e) => setFoodEntries(prev => [...prev, e])}
          onRemove={(id) => setFoodEntries(prev => prev.filter(e => e.id !== id))}
        />
      </section>

      <Separator />

      {/* ─── Finance ─────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Finance
        </h2>
        <FinanceWidget
          date={today}
          entries={financeEntries}
          onAdd={(e) => setFinanceEntries(prev => [...prev, e])}
          onRemove={(id) => setFinanceEntries(prev => prev.filter(e => e.id !== id))}
        />
      </section>

      <Separator />

      {/* ─── Journal ─────────────────────────────────────────────── */}
      <section className="space-y-3">
        <button onClick={() => setJournalOpen(v => !v)}
          className="w-full flex items-center justify-between">
          <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            <BookOpen size={11} className="inline mr-1.5 mb-0.5" />
            Journal
          </h2>
          <span className="text-[11px] text-muted-foreground">{log.journal ? `${log.journal.length} chars` : 'optional'}</span>
        </button>
        {journalOpen && (
          <textarea
            placeholder="Reflect on your day…"
            value={log.journal ?? ''}
            onChange={(e) => update({ journal: e.target.value })}
            className="w-full min-h-[90px] rounded-2xl bg-card border border-border px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 resize-none focus:outline-none focus:border-primary/40 transition-colors slide-up"
          />
        )}
      </section>

      {/* ─── Score banner ────────────────────────────────────────── */}
      <div className={`flex items-center justify-center gap-2.5 p-4 rounded-2xl border transition-all duration-500
        ${score >= 80 ? 'bg-green-500/8 border-green-500/20 text-green-400'
          : score >= 60 ? 'bg-primary/8 border-primary/20 text-primary'
          : 'bg-card border-border text-muted-foreground'}`}>
        <Check size={16} />
        <span className="text-[13px] font-semibold">
          {score >= 80 ? 'Crushing it today 🔥' : score >= 60 ? 'Good progress 💪' : `${score}/100 — keep going`}
        </span>
      </div>
    </div>
  )
}
