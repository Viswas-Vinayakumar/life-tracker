'use client'

import { useState, useEffect, useRef } from 'react'
import { format, parseISO, subDays } from 'date-fns'
import { Check, X, ChevronDown, ChevronUp, Pencil, Save, Loader2, CalendarPlus } from 'lucide-react'
import { getScoreColor, getScoreLabel, calculateScore } from '@/lib/scoring'
import { getLogs, upsertLog, getLog } from '@/lib/db'
import type { DailyLog } from '@/types'
import { toast } from 'sonner'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { logActivity } from '@/lib/activityLog'

function HabitDot({ done, color }: { done: boolean; color?: string }) {
  return (
    <div style={{
      width: 18, height: 18, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: done ? `color-mix(in srgb, ${color ?? 'var(--accent)'} 18%, transparent)` : 'var(--bg-3)',
    }}>
      {done
        ? <Check size={9} strokeWidth={3} color={color ?? 'var(--accent)'} />
        : <X size={8} strokeWidth={2} color="var(--text-3)" style={{ opacity: 0.35 }} />}
    </div>
  )
}

function Slider({ value, max, onChange, color }: { value: number; max: number; onChange: (v: number) => void; color: string }) {
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      {Array.from({ length: max }, (_, i) => (
        <button key={i} onClick={() => onChange(value === i + 1 ? 0 : i + 1)}
          style={{
            minWidth: 24, height: 24, borderRadius: 6, border: 'none', cursor: 'default', fontSize: 11, fontWeight: 700,
            background: i < value ? `color-mix(in srgb, ${color} 18%, transparent)` : 'var(--bg-3)',
            color: i < value ? color : 'var(--text-3)',
            outline: i + 1 === value ? `1.5px solid ${color}` : 'none',
            transition: 'all 0.1s ease',
          }}>
          {i + 1}
        </button>
      ))}
    </div>
  )
}

const EMPTY_LOG = (date: string): DailyLog => ({
  date,
  gym_done: false,
  study_done: false,
  skincare_am: false,
  skincare_pm: false,
  water_glasses: 0,
})

export default function HistoryPage() {
  const [logs, setLogs] = useState<DailyLog[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<DailyLog>>({})
  const [saving, setSaving] = useState(false)
  const [confirm, setConfirm] = useState<{ open: boolean; logDate?: string }>({ open: false })

  // Past-day picker state
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerDate, setPickerDate] = useState('')
  const [pickerLoading, setPickerLoading] = useState(false)
  const [pickerConfirm, setPickerConfirm] = useState<{ open: boolean; existing: boolean; date: string; log: DailyLog | null }>({ open: false, existing: false, date: '', log: null })
  const dateInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getLogs(90).then(data => { setLogs(data); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const startEdit = (log: DailyLog) => {
    setEditing(log.date)
    setEditData({ ...log })
  }

  const cancelEdit = () => {
    setEditing(null)
    setEditData({})
  }

  const saveEdit = async (date: string) => {
    setSaving(true)
    try {
      const food: never[] = []
      const score = calculateScore(editData, food)
      const updated = { ...editData, performance_score: score, date }
      await upsertLog(updated)
      await logActivity('history_edit', 'edited', `Edited log for ${date}`, date)
      setLogs(prev => {
        const exists = prev.find(l => l.date === date)
        if (exists) return prev.map(l => l.date === date ? { ...l, ...updated } as DailyLog : l)
        return [...prev, updated as DailyLog].sort((a, b) => b.date.localeCompare(a.date))
      })
      setEditing(null)
      setEditData({})
      toast.success('Day updated')
    } catch { toast.error('Failed to save') }
    finally { setSaving(false) }
  }

  const patch = (k: keyof DailyLog, v: DailyLog[keyof DailyLog]) => setEditData(prev => ({ ...prev, [k]: v }))

  // Load a past date and check if it already has data
  const openPastDay = async () => {
    if (!pickerDate) return
    setPickerLoading(true)
    try {
      const existing = await getLog(pickerDate)
      setPickerConfirm({ open: true, existing: Boolean(existing), date: pickerDate, log: existing })
    } catch {
      setPickerConfirm({ open: true, existing: false, date: pickerDate, log: null })
    }
    setPickerLoading(false)
  }

  const confirmOpenPastDay = () => {
    const { date, log } = pickerConfirm
    const logToEdit = log ?? EMPTY_LOG(date)
    setPickerConfirm({ open: false, existing: false, date: '', log: null })
    setPickerOpen(false)
    setPickerDate('')

    // Add to list if not already there
    setLogs(prev => {
      const exists = prev.find(l => l.date === date)
      if (!exists) return [...prev, logToEdit].sort((a, b) => b.date.localeCompare(a.date))
      return prev
    })
    // Open + enter edit mode for that date
    setExpanded(date)
    startEdit(logToEdit)
    // Scroll after a tick so the element exists
    setTimeout(() => {
      document.getElementById(`day-${date}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 120)
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 12, color: 'var(--text-3)' }}>
      <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid var(--accent)', borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite' }} />
    </div>
  )

  const sorted = [...logs].sort((a, b) => b.date.localeCompare(a.date))
  const last30 = sorted.slice(0, 30)
  const maxDate = format(subDays(new Date(), 1), 'yyyy-MM-dd')

  return (
    <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 860 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 className="title-lg">History</h1>
          <p className="footnote" style={{ marginTop: 4 }}>Last 90 days · {logs.length} logged · tap <strong>Edit</strong> on any row to update past data</p>
        </div>

        {/* Log Past Day picker */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', position: 'relative' }}>
          {pickerOpen && (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', animation: 'fade-up 0.15s ease both' }}>
              <input
                ref={dateInputRef}
                type="date"
                value={pickerDate}
                max={maxDate}
                onChange={e => setPickerDate(e.target.value)}
                style={{
                  height: 32, borderRadius: 8, border: '1px solid var(--border)', padding: '0 10px',
                  fontSize: 12, background: 'var(--bg-2)', color: 'var(--text-1)', cursor: 'default',
                }}
              />
              <button
                onClick={openPastDay}
                disabled={!pickerDate || pickerLoading}
                style={{
                  height: 32, padding: '0 12px', borderRadius: 8, border: 'none',
                  background: pickerDate ? 'var(--accent)' : 'var(--bg-3)',
                  color: pickerDate ? '#fff' : 'var(--text-3)',
                  fontSize: 12, fontWeight: 600, cursor: 'default', display: 'flex', alignItems: 'center', gap: 5,
                  opacity: pickerLoading ? 0.7 : 1,
                }}>
                {pickerLoading
                  ? <><Loader2 size={11} style={{ animation: 'spin 0.7s linear infinite' }} /> Loading…</>
                  : 'Open'}
              </button>
              <button onClick={() => { setPickerOpen(false); setPickerDate('') }}
                style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)', background: 'none', cursor: 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)' }}>
                <X size={12} />
              </button>
            </div>
          )}
          <button
            onClick={() => { setPickerOpen(p => !p); setTimeout(() => dateInputRef.current?.focus(), 60) }}
            style={{
              height: 32, padding: '0 12px', borderRadius: 8, border: '1px solid var(--border)',
              background: pickerOpen ? 'color-mix(in srgb, var(--accent) 12%, transparent)' : 'var(--bg-2)',
              color: pickerOpen ? 'var(--accent)' : 'var(--text-2)',
              fontSize: 12, fontWeight: 600, cursor: 'default', display: 'flex', alignItems: 'center', gap: 6,
              outline: pickerOpen ? '1.5px solid var(--accent)' : 'none',
            }}>
            <CalendarPlus size={12} />
            Log Past Day
          </button>
        </div>
      </div>

      {/* 30-day heatmap */}
      {last30.length > 0 && (
        <section>
          <p className="section-label">30-Day Grid</p>
          <div className="card" style={{ padding: '14px 16px', overflowX: 'auto' }}>
            <div style={{ minWidth: 480 }}>
              <div style={{ display: 'grid', gap: 4, gridTemplateColumns: '72px repeat(30, 1fr)' }}>
                <div />
                {[...last30].reverse().map(l => (
                  <div key={l.date} style={{ textAlign: 'center', fontSize: 8, color: 'var(--text-3)' }}>
                    {format(parseISO(l.date), 'd')}
                  </div>
                ))}
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
                          background: l[key] ? `color-mix(in srgb, ${color} 65%, transparent)` : 'var(--bg-3)',
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

      <div style={{ height: 1, background: 'var(--border-2)' }} />

      {/* Day log list */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <p className="section-label">All Days</p>
        {sorted.length === 0 ? (
          <div className="card" style={{ padding: '48px 0', textAlign: 'center', color: 'var(--text-3)' }}>
            <p style={{ fontSize: 32, marginBottom: 8 }}>📅</p>
            <p style={{ fontSize: 13 }}>No history yet — use "Log Past Day" to add one</p>
          </div>
        ) : sorted.map((log, idx) => {
          const score = log.performance_score ?? 0
          const color = getScoreColor(score)
          const isExpanded = expanded === log.date
          const isEditing = editing === log.date
          const ed = isEditing ? editData : log

          return (
            <div id={`day-${log.date}`} key={log.date} className="card" style={{ overflow: 'hidden', animation: `fade-up 0.14s ${Math.min(idx, 10) * 0.02}s ease both` }}>
              {/* Row header */}
              <div style={{ display: 'flex', alignItems: 'center', padding: '12px 14px', gap: 10 }}>
                <button
                  onClick={() => { setExpanded(isExpanded ? null : log.date); if (isEditing) cancelEdit() }}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'default', textAlign: 'left' }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600 }}>{format(parseISO(log.date), 'EEEE, MMM d')}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 5 }}>
                      <HabitDot done={log.gym_done} color="var(--violet)" />
                      <HabitDot done={log.study_done} color="var(--cyan)" />
                      <HabitDot done={log.skincare_am} color="var(--amber)" />
                      <HabitDot done={log.skincare_pm} color="var(--indigo)" />
                      <span style={{ fontSize: 10, color: 'var(--text-3)', marginLeft: 2 }}>
                        {[log.gym_done, log.study_done, log.skincare_am, log.skincare_pm].filter(Boolean).length}/4
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ textAlign: 'right' }}>
                      <span className="tabular-nums" style={{ fontSize: 20, fontWeight: 700, color }}>{score}</span>
                      <p style={{ fontSize: 10, fontWeight: 600, color }}>{getScoreLabel(score)}</p>
                    </div>
                    {isExpanded ? <ChevronUp size={12} color="var(--text-3)" /> : <ChevronDown size={12} color="var(--text-3)" />}
                  </div>
                </button>

                {/* Edit button — always visible */}
                <button
                  onClick={e => { e.stopPropagation(); isEditing ? cancelEdit() : (setExpanded(log.date), startEdit(log)) }}
                  title={isEditing ? 'Cancel edit' : 'Edit this day'}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4, padding: '5px 9px', borderRadius: 7, border: '1px solid var(--border-2)', cursor: 'default', fontSize: 11, fontWeight: 600,
                    background: isEditing ? 'color-mix(in srgb, var(--error) 10%, transparent)' : 'var(--bg-2)',
                    color: isEditing ? 'var(--error)' : 'var(--text-2)',
                    transition: 'all 0.15s', flexShrink: 0,
                  }}>
                  {isEditing ? <X size={11} /> : <Pencil size={11} />}
                  {isEditing ? 'Cancel' : 'Edit'}
                </button>
              </div>

              {/* Expanded panel */}
              {isExpanded && (
                <div style={{ padding: '0 14px 14px', borderTop: '1px solid var(--border-2)', paddingTop: 14, animation: 'fade-up 0.15s ease both' }}>
                  {isEditing ? (
                    /* ─── EDIT MODE ─────────────────────────────── */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {/* Habits toggles */}
                      <div>
                        <p className="footnote" style={{ marginBottom: 8 }}>Habits</p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                          {[
                            { key: 'gym_done' as const, label: '🏋️ Gym', color: 'var(--violet)' },
                            { key: 'study_done' as const, label: '📚 Study', color: 'var(--cyan)' },
                            { key: 'skincare_am' as const, label: '☀️ Skincare AM', color: 'var(--amber)' },
                            { key: 'skincare_pm' as const, label: '🌙 Skincare PM', color: 'var(--indigo)' },
                          ].map(({ key, label, color: c }) => (
                            <button key={key} onClick={() => patch(key, !ed[key])}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8,
                                border: 'none', cursor: 'default', textAlign: 'left',
                                background: ed[key] ? `color-mix(in srgb, ${c} 14%, transparent)` : 'var(--bg-2)',
                                outline: ed[key] ? `1.5px solid ${c}` : 'none',
                                transition: 'all 0.15s ease',
                              }}>
                              <div style={{
                                width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                background: ed[key] ? c : 'var(--bg-3)',
                              }}>
                                {ed[key] && <Check size={10} color="white" strokeWidth={3} />}
                              </div>
                              <span style={{ fontSize: 12, fontWeight: 600, color: ed[key] ? c : 'var(--text-2)' }}>{label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Notes */}
                      {(ed.gym_done || ed.study_done) && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {ed.gym_done && (
                            <div>
                              <p className="footnote" style={{ marginBottom: 4 }}>Gym notes</p>
                              <input value={ed.gym_notes ?? ''} onChange={e => patch('gym_notes', e.target.value)} placeholder="What did you train?"
                                style={{ width: '100%', height: 34, borderRadius: 8, border: '1px solid var(--border)', padding: '0 10px', fontSize: 13, background: 'var(--bg-2)', color: 'var(--text-1)' }} />
                            </div>
                          )}
                          {ed.study_done && (
                            <div>
                              <p className="footnote" style={{ marginBottom: 4 }}>Study notes</p>
                              <input value={ed.study_notes ?? ''} onChange={e => patch('study_notes', e.target.value)} placeholder="What did you study?"
                                style={{ width: '100%', height: 34, borderRadius: 8, border: '1px solid var(--border)', padding: '0 10px', fontSize: 13, background: 'var(--bg-2)', color: 'var(--text-1)' }} />
                            </div>
                          )}
                        </div>
                      )}

                      {/* Vitals */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div>
                          <p className="footnote" style={{ marginBottom: 6 }}>💧 Water glasses</p>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {Array.from({ length: 10 }, (_, i) => (
                              <button key={i} onClick={() => patch('water_glasses', i < (ed.water_glasses ?? 0) ? i : i + 1)}
                                style={{
                                  width: 26, height: 26, borderRadius: 6, border: 'none', cursor: 'default', fontSize: 13,
                                  background: i < (ed.water_glasses ?? 0) ? 'color-mix(in srgb, var(--cyan) 18%, transparent)' : 'var(--bg-3)',
                                  outline: i < (ed.water_glasses ?? 0) ? '1.5px solid var(--cyan)' : 'none',
                                }}>
                                💧
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <p className="footnote" style={{ marginBottom: 6 }}>😴 Sleep hours</p>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {[5, 6, 7, 7.5, 8, 9].map(h => (
                              <button key={h} onClick={() => patch('sleep_hours', ed.sleep_hours === h ? undefined : h)}
                                style={{
                                  padding: '4px 8px', borderRadius: 6, border: 'none', cursor: 'default', fontSize: 11, fontWeight: 600,
                                  background: ed.sleep_hours === h ? 'color-mix(in srgb, var(--indigo) 18%, transparent)' : 'var(--bg-3)',
                                  color: ed.sleep_hours === h ? 'var(--indigo)' : 'var(--text-3)',
                                  outline: ed.sleep_hours === h ? '1.5px solid var(--indigo)' : 'none',
                                }}>
                                {h}h
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <p className="footnote" style={{ marginBottom: 6 }}>😊 Mood ({ed.mood ?? '—'}/10)</p>
                          <Slider value={ed.mood ?? 0} max={10} color="var(--warning)" onChange={v => patch('mood', v || undefined)} />
                        </div>

                        <div>
                          <p className="footnote" style={{ marginBottom: 6 }}>⚡ Energy ({ed.energy ?? '—'}/10)</p>
                          <Slider value={ed.energy ?? 0} max={10} color="var(--violet)" onChange={v => patch('energy', v || undefined)} />
                        </div>
                      </div>

                      {/* Journal */}
                      <div>
                        <p className="footnote" style={{ marginBottom: 6 }}>Journal</p>
                        <textarea value={ed.journal ?? ''} onChange={e => patch('journal', e.target.value)} placeholder="Anything to note about this day…"
                          style={{ width: '100%', minHeight: 60, resize: 'none', borderRadius: 8, border: '1px solid var(--border)', padding: '8px 10px', fontSize: 13, background: 'var(--bg-2)', color: 'var(--text-1)', lineHeight: 1.5 }} />
                      </div>

                      {/* Action buttons */}
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={cancelEdit}
                          style={{ flex: 1, height: 34, borderRadius: 8, border: '1px solid var(--border)', background: 'none', cursor: 'default', fontSize: 13, color: 'var(--text-2)' }}>
                          Cancel
                        </button>
                        <button onClick={() => setConfirm({ open: true, logDate: log.date })} disabled={saving}
                          style={{ flex: 2, height: 34, borderRadius: 8, border: 'none', background: 'var(--accent)', cursor: 'default', fontSize: 13, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                          {saving ? <Loader2 size={13} style={{ animation: 'spin 0.7s linear infinite' }} /> : <Save size={13} />}
                          {saving ? 'Saving…' : 'Save Changes'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* ─── VIEW MODE ─────────────────────────────── */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
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
                        <div style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--bg-2)' }}>
                          <p style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 3 }}>Journal</p>
                          <p style={{ fontSize: 12 }}>{log.journal}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </section>

      {/* Confirm: save edit */}
      <ConfirmDialog
        open={confirm.open && Boolean(confirm.logDate)}
        title="Save changes?"
        message={`Update your log for ${confirm.logDate ? format(parseISO(confirm.logDate), 'EEEE, MMM d') : 'this day'}? This will overwrite the existing entry.`}
        confirmLabel="Save"
        onConfirm={() => { const d = confirm.logDate!; setConfirm({ open: false }); saveEdit(d) }}
        onCancel={() => setConfirm({ open: false })}
      />

      {/* Confirm: open past day (overwrite warning) */}
      <ConfirmDialog
        open={pickerConfirm.open}
        title={pickerConfirm.existing ? 'Edit existing entry?' : 'Log this day?'}
        message={
          pickerConfirm.existing
            ? `${pickerConfirm.date ? format(parseISO(pickerConfirm.date), 'EEEE, MMM d, yyyy') : 'This day'} already has data. You can view and update it.`
            : `Open a new log for ${pickerConfirm.date ? format(parseISO(pickerConfirm.date), 'EEEE, MMM d, yyyy') : 'this day'} and fill it in.`
        }
        confirmLabel={pickerConfirm.existing ? 'Open & Edit' : 'Create Entry'}
        onConfirm={confirmOpenPastDay}
        onCancel={() => setPickerConfirm({ open: false, existing: false, date: '', log: null })}
      />
    </div>
  )
}
