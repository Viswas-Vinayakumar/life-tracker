'use client'

import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import {
  Plus, Trash2, Clock, Dumbbell, Zap, RefreshCw, ChevronDown, ChevronUp, Check
} from 'lucide-react'
import { toast } from 'sonner'
import { getWorkoutSession, saveWorkoutSession, getWorkoutHistory, upsertLog, getLog } from '@/lib/db'
import { isOllamaRunning, getGymCoaching, type GymCoachResponse } from '@/lib/ollama'
import { getExerciseSuggestions, detectMuscleGroup } from '@/lib/gymKnowledge'
import type { WorkoutSession, WorkoutExercise, WorkoutSet } from '@/types'

const TODAY = format(new Date(), 'yyyy-MM-dd')

const RATING_COLOR: Record<GymCoachResponse['rating'], string> = {
  excellent: 'var(--success)', good: 'var(--cyan)', fair: 'var(--warning)', below_par: 'var(--error)',
}
const RATING_LABEL: Record<GymCoachResponse['rating'], string> = {
  excellent: 'Excellent', good: 'Good', fair: 'Fair', below_par: 'Below Par',
}

function mkId() { return Math.random().toString(36).slice(2, 9) }

function mkSet(): WorkoutSet { return { reps: 0, weight_kg: undefined } }

function mkExercise(name = ''): WorkoutExercise {
  return { name, muscle_group: name ? detectMuscleGroup(name) : undefined, sets: [mkSet(), mkSet(), mkSet()] }
}

// ── Animated ring ─────────────────────────────────────────────
function MiniRing({ score, color, size = 48, stroke = 5 }: { score: number; color: string; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--bg-3)" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${(score / 100) * c} ${c}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 1s cubic-bezier(0.34,1.2,0.64,1)', filter: `drop-shadow(0 0 3px ${color}80)` }} />
    </svg>
  )
}

export default function GymPage() {
  const [session,   setSession]   = useState<WorkoutSession>({ date: TODAY, exercises: [], duration_min: undefined })
  const [history,   setHistory]   = useState<WorkoutSession[]>([])
  const [ollamaOk,  setOllamaOk]  = useState<boolean | null>(null)
  const [coach,     setCoach]     = useState<GymCoachResponse | null>(null)
  const [coaching,  setCoaching]  = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [gymDone,   setGymDone]   = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [activeExIdx, setActiveExIdx] = useState<number | null>(null)

  // ── Load existing session + history + gym_done status ──
  useEffect(() => {
    Promise.all([
      getWorkoutSession(TODAY),
      getWorkoutHistory(10),
      getLog(TODAY),
    ]).then(([s, h, log]) => {
      if (s) setSession(s)
      setHistory(h.filter(w => w.date !== TODAY))
      if (log?.gym_done) setGymDone(true)
    })
    isOllamaRunning().then(setOllamaOk)
  }, [])

  // ── Auto-save on session change ──
  useEffect(() => {
    if (session.exercises.length > 0) {
      const t = setTimeout(() => saveWorkoutSession(session), 1000)
      return () => clearTimeout(t)
    }
  }, [session])

  // ── Exercise mutations ──
  const addExercise = () => {
    setSession(s => ({ ...s, exercises: [...s.exercises, mkExercise()] }))
    setActiveExIdx(session.exercises.length)
  }

  const updateExerciseName = (idx: number, name: string) => {
    setSession(s => {
      const exs = [...s.exercises]
      exs[idx] = { ...exs[idx], name, muscle_group: detectMuscleGroup(name) }
      return { ...s, exercises: exs }
    })
    setSuggestions(getExerciseSuggestions(name))
    setActiveExIdx(idx)
  }

  const pickSuggestion = (idx: number, name: string) => {
    setSession(s => {
      const exs = [...s.exercises]
      exs[idx] = { ...exs[idx], name, muscle_group: detectMuscleGroup(name) }
      return { ...s, exercises: exs }
    })
    setSuggestions([])
  }

  const removeExercise = (idx: number) => {
    setSession(s => ({ ...s, exercises: s.exercises.filter((_, i) => i !== idx) }))
  }

  const addSet = (exIdx: number) => {
    setSession(s => {
      const exs = [...s.exercises]
      exs[exIdx] = { ...exs[exIdx], sets: [...exs[exIdx].sets, mkSet()] }
      return { ...s, exercises: exs }
    })
  }

  const removeSet = (exIdx: number, setIdx: number) => {
    setSession(s => {
      const exs = [...s.exercises]
      exs[exIdx] = { ...exs[exIdx], sets: exs[exIdx].sets.filter((_, i) => i !== setIdx) }
      return { ...s, exercises: exs }
    })
  }

  const updateSet = (exIdx: number, setIdx: number, field: keyof WorkoutSet, raw: string) => {
    const val = raw === '' ? undefined : Number(raw)
    setSession(s => {
      const exs = [...s.exercises]
      const sets = [...exs[exIdx].sets]
      sets[setIdx] = { ...sets[setIdx], [field]: val }
      exs[exIdx] = { ...exs[exIdx], sets }
      return { ...s, exercises: exs }
    })
  }

  // ── Save + mark gym done ──
  const handleSave = async () => {
    setSaving(true)
    try {
      const final: WorkoutSession = { ...session, created_at: session.created_at ?? new Date().toISOString() }
      await saveWorkoutSession(final)
      await upsertLog({ date: TODAY, gym_done: true })
      setGymDone(true)
      toast.success('Session saved · Gym marked done ✓')
      // Trigger AI coaching
      loadCoaching(final)
    } catch { toast.error('Failed to save') }
    finally { setSaving(false) }
  }

  // ── AI Coaching ──
  const loadCoaching = useCallback(async (s?: WorkoutSession) => {
    const target = s ?? session
    if (target.exercises.length === 0) return
    setCoaching(true)
    try {
      const result = await getGymCoaching(target, history)
      if (result) setCoach(result)
    } finally { setCoaching(false) }
  }, [session, history])

  // ── Stats ──
  const totalSets   = session.exercises.reduce((n, e) => n + e.sets.length, 0)
  const totalReps   = session.exercises.reduce((n, e) => n + e.sets.reduce((r, s) => r + (s.reps || 0), 0), 0)
  const totalVolume = session.exercises.reduce((n, e) => n + e.sets.reduce((v, s) => v + (s.reps || 0) * (s.weight_kg ?? 0), 0), 0)

  const RATING_SCORE: Record<GymCoachResponse['rating'], number> = { excellent: 95, good: 78, fair: 55, below_par: 32 }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1100 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', animation: 'fade-up 0.18s ease both' }}>
        <div>
          <h1 className="title-lg">Gym</h1>
          <p className="footnote" style={{ marginTop: 4 }}>{format(new Date(), 'EEEE, MMMM d')} · {session.exercises.length} exercises · {totalSets} sets</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {gymDone && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 20, background: 'color-mix(in srgb, var(--success) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--success) 25%, transparent)' }}>
              <Check size={11} color="var(--success)" />
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--success)' }}>Gym Done</span>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 20, background: ollamaOk ? 'color-mix(in srgb, var(--success) 10%, transparent)' : 'var(--bg-2)', border: `1px solid ${ollamaOk ? 'color-mix(in srgb, var(--success) 25%, transparent)' : 'var(--border-2)'}` }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: ollamaOk ? 'var(--success)' : 'var(--text-3)' }} />
            <span style={{ fontSize: 10, fontWeight: 600, color: ollamaOk ? 'var(--success)' : 'var(--text-3)' }}>{ollamaOk ? 'AI Coach' : 'No AI'}</span>
          </div>
        </div>
      </div>

      {/* ── 2-col layout ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 16, alignItems: 'start' }}>

        {/* ── LEFT: Session ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Session header card */}
          <div className="card" style={{ padding: '14px 16px', animation: 'fade-up 0.2s 0.04s ease both' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              {/* Duration */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={13} color="var(--text-3)" />
                <input
                  type="number" min={0} max={300} placeholder="min"
                  value={session.duration_min ?? ''}
                  onChange={e => setSession(s => ({ ...s, duration_min: e.target.value ? Number(e.target.value) : undefined }))}
                  style={{ width: 58, height: 28, borderRadius: 8, border: '1px solid var(--border)', padding: '0 8px', fontSize: 12, background: 'var(--bg-2)', color: 'var(--text-1)', textAlign: 'center' }}
                />
                <span style={{ fontSize: 11, color: 'var(--text-3)' }}>min total</span>
              </div>

              {/* Session stats */}
              {totalVolume > 0 && (
                <div style={{ display: 'flex', gap: 12, marginLeft: 'auto' }}>
                  {[
                    { label: 'Reps',   value: totalReps },
                    { label: 'Volume', value: `${Math.round(totalVolume)}kg` },
                  ].map(s => (
                    <div key={s.label} style={{ textAlign: 'center' }}>
                      <p className="tabular-nums" style={{ fontSize: 16, fontWeight: 800, color: 'var(--accent)' }}>{s.value}</p>
                      <p style={{ fontSize: 9, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Exercises */}
          {session.exercises.map((ex, exIdx) => (
            <div key={exIdx} className="card" style={{ padding: '14px 16px', animation: `fade-up 0.18s ${exIdx * 0.04}s ease both`, position: 'relative', overflow: 'hidden' }}>
              {/* Muscle group accent line */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, var(--violet), transparent)', opacity: 0.5 }} />

              {/* Exercise header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, position: 'relative' }}>
                <div style={{ width: 24, height: 24, borderRadius: 6, background: 'color-mix(in srgb, var(--violet) 12%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Dumbbell size={12} color="var(--violet)" />
                </div>
                <div style={{ flex: 1, position: 'relative' }}>
                  <input
                    value={ex.name}
                    onChange={e => updateExerciseName(exIdx, e.target.value)}
                    onFocus={() => setActiveExIdx(exIdx)}
                    onBlur={() => setTimeout(() => setSuggestions([]), 200)}
                    placeholder="Exercise name…"
                    style={{ width: '100%', height: 32, borderRadius: 8, border: '1px solid var(--border)', padding: '0 10px', fontSize: 13, fontWeight: 600, background: 'var(--bg-2)', color: 'var(--text-1)' }}
                  />
                  {/* Autocomplete suggestions */}
                  {activeExIdx === exIdx && suggestions.length > 0 && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20,
                      background: 'var(--surface)', border: '1px solid var(--border-2)', borderRadius: 10,
                      boxShadow: '0 8px 24px rgba(0,0,0,0.2)', overflow: 'hidden', marginTop: 3,
                    }}>
                      {suggestions.map(s => (
                        <button key={s} onMouseDown={() => pickSuggestion(exIdx, s)}
                          style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', fontSize: 12, border: 'none', background: 'transparent', color: 'var(--text-1)', cursor: 'default' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-2)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {ex.muscle_group && (
                  <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 10, background: 'color-mix(in srgb, var(--cyan) 12%, transparent)', color: 'var(--cyan)', textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>
                    {ex.muscle_group}
                  </span>
                )}
                <button onClick={() => removeExercise(exIdx)}
                  style={{ width: 26, height: 26, borderRadius: 6, border: 'none', background: 'transparent', cursor: 'default', color: 'var(--text-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.12s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'color-mix(in srgb, var(--error) 10%, transparent)'; e.currentTarget.style.color = 'var(--error)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-3)' }}>
                  <Trash2 size={11} />
                </button>
              </div>

              {/* Sets table header */}
              <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr 1fr 24px', gap: 6, marginBottom: 6, paddingLeft: 2 }}>
                {['Set', 'Reps', 'Weight (kg)', ''].map((h, i) => (
                  <span key={i} style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</span>
                ))}
              </div>

              {/* Sets */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {ex.sets.map((set, setIdx) => (
                  <div key={setIdx} style={{ display: 'grid', gridTemplateColumns: '28px 1fr 1fr 24px', gap: 6, alignItems: 'center' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textAlign: 'center' }}>{setIdx + 1}</span>
                    <input
                      type="number" min={0} max={100} placeholder="—"
                      value={set.reps || ''}
                      onChange={e => updateSet(exIdx, setIdx, 'reps', e.target.value)}
                      style={{ height: 32, borderRadius: 8, border: '1px solid var(--border)', padding: '0 10px', fontSize: 13, fontWeight: 600, background: 'var(--bg-2)', color: 'var(--text-1)', textAlign: 'center' }}
                    />
                    <input
                      type="number" min={0} max={500} step={2.5} placeholder="—"
                      value={set.weight_kg ?? ''}
                      onChange={e => updateSet(exIdx, setIdx, 'weight_kg', e.target.value)}
                      style={{ height: 32, borderRadius: 8, border: '1px solid var(--border)', padding: '0 10px', fontSize: 13, background: 'var(--bg-2)', color: 'var(--text-1)', textAlign: 'center' }}
                    />
                    <button onClick={() => removeSet(exIdx, setIdx)} disabled={ex.sets.length <= 1}
                      style={{ width: 22, height: 22, borderRadius: 5, border: 'none', background: 'transparent', cursor: ex.sets.length > 1 ? 'default' : 'not-allowed', color: ex.sets.length > 1 ? 'var(--text-3)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      onMouseEnter={e => { if (ex.sets.length > 1) e.currentTarget.style.color = 'var(--error)' }}
                      onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}>
                      <Trash2 size={9} />
                    </button>
                  </div>
                ))}
              </div>

              <button onClick={() => addSet(exIdx)}
                style={{ marginTop: 10, height: 28, padding: '0 10px', borderRadius: 8, border: '1px dashed var(--border-2)', background: 'transparent', cursor: 'default', fontSize: 11, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 4, transition: 'all 0.12s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-2)'; e.currentTarget.style.color = 'var(--text-3)' }}>
                <Plus size={10} /> Add Set
              </button>
            </div>
          ))}

          {/* Add exercise + Save */}
          <div style={{ display: 'flex', gap: 8, animation: 'fade-up 0.2s 0.1s ease both' }}>
            <button onClick={addExercise}
              style={{ flex: 1, height: 40, borderRadius: 10, border: '1.5px dashed var(--border-2)', background: 'transparent', cursor: 'default', fontSize: 13, fontWeight: 600, color: 'var(--text-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--violet)'; e.currentTarget.style.color = 'var(--violet)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-2)'; e.currentTarget.style.color = 'var(--text-3)' }}>
              <Plus size={14} /> Add Exercise
            </button>
            <button onClick={handleSave} disabled={saving || session.exercises.length === 0}
              style={{ height: 40, padding: '0 20px', borderRadius: 10, border: 'none', background: 'var(--accent)', cursor: 'default', fontSize: 13, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 6, opacity: session.exercises.length === 0 ? 0.4 : 1, transition: 'opacity 0.15s' }}>
              {saving ? <div style={{ width: 13, height: 13, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', animation: 'spin 0.7s linear infinite' }} /> : <Check size={14} />}
              Save Session
            </button>
          </div>
        </div>

        {/* ── RIGHT: AI Coach ── */}
        <div className="card" style={{
          padding: '16px 18px', position: 'sticky', top: 24, height: 'fit-content',
          borderColor: coach ? `color-mix(in srgb, ${RATING_COLOR[coach.rating]} 25%, transparent)` : 'var(--border-2)',
          animation: 'fade-up 0.22s 0.08s ease both', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, var(--violet), var(--cyan))', opacity: 0.8 }} />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: 'color-mix(in srgb, var(--violet) 12%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Zap size={14} color="var(--violet)" />
              </div>
              <div>
                <p style={{ fontSize: 12, fontWeight: 700 }}>Gym Coach AI</p>
                <p className="footnote">Lean muscle · &lt;10% BF</p>
              </div>
            </div>
            <button onClick={() => loadCoaching()} disabled={coaching || !ollamaOk || session.exercises.length === 0}
              style={{ width: 26, height: 26, borderRadius: 7, border: 'none', background: 'var(--bg-2)', cursor: 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-2)', opacity: !ollamaOk ? 0.35 : 1 }}>
              <RefreshCw size={11} style={{ animation: coaching ? 'spin 1s linear infinite' : 'none' }} />
            </button>
          </div>

          {/* Loading */}
          {coaching && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '28px 0', color: 'var(--text-3)' }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid var(--violet)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
              <span style={{ fontSize: 12 }}>Analysing your session…</span>
            </div>
          )}

          {/* Coach result */}
          {!coaching && coach && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, animation: 'fade-up 0.2s ease both' }}>
              {/* Rating + headline */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <MiniRing score={RATING_SCORE[coach.rating]} color={RATING_COLOR[coach.rating]} size={48} stroke={5} />
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 9, fontWeight: 800, color: RATING_COLOR[coach.rating] }}>
                      {RATING_SCORE[coach.rating]}
                    </span>
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 10, background: `color-mix(in srgb, ${RATING_COLOR[coach.rating]} 12%, transparent)`, color: RATING_COLOR[coach.rating], textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                    {RATING_LABEL[coach.rating]}
                  </span>
                  <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', marginTop: 4, lineHeight: 1.3 }}>{coach.headline}</p>
                </div>
              </div>

              <div style={{ height: 1, background: 'var(--border-2)' }} />

              {[
                { icon: <Dumbbell size={10} color="var(--violet)" />, label: 'Volume', text: coach.volume_analysis },
                { icon: <Zap size={10} color="var(--amber)" />,      label: 'Overload',  text: coach.overload_tip },
                { icon: <ChevronUp size={10} color="var(--cyan)" />,  label: 'Next Session', text: coach.next_session },
                { icon: <Clock size={10} color="var(--success)" />,   label: 'Recovery', text: coach.recovery_tip },
              ].map(({ icon, label, text }) => text && (
                <div key={label}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                    {icon}
                    <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</span>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6 }}>{text}</p>
                </div>
              ))}

              {coach.form_note && (
                <div style={{ padding: '9px 11px', borderRadius: 9, background: 'color-mix(in srgb, var(--warning) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--warning) 20%, transparent)' }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--warning)', marginBottom: 3 }}>Form Note</p>
                  <p style={{ fontSize: 11, color: 'var(--text-2)', lineHeight: 1.5 }}>{coach.form_note}</p>
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {!coaching && !coach && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '28px 0', color: 'var(--text-3)', textAlign: 'center' }}>
              <Dumbbell size={24} style={{ opacity: 0.2 }} />
              <p style={{ fontSize: 12, lineHeight: 1.5 }}>
                {session.exercises.length === 0
                  ? 'Add exercises to get AI coaching'
                  : ollamaOk
                    ? 'Save your session to get coaching'
                    : 'Install Ollama for AI coaching'}
              </p>
              {!ollamaOk && <code style={{ fontSize: 10 }}>brew install ollama</code>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
