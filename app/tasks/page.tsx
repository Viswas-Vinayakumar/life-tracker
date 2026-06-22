'use client'

import { useState, useEffect, useRef } from 'react'
import { Plus, Check, Trash2, ArrowDownToLine, ArrowUpToLine, Flag, Clock, Pencil, X, CalendarDays, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { getTodos, addTodo, updateTodo, deleteTodo, completeTodo } from '@/lib/db'
import { logActivity } from '@/lib/activityLog'
import type { Todo } from '@/types'
import { format, parseISO, isPast, isToday, differenceInDays } from 'date-fns'
import ConfirmDialog from '@/components/ui/ConfirmDialog'

type Tab = 'today' | 'backlog' | 'completed'

const PRIORITY_COLOR: Record<Todo['priority'], string> = {
  high:   'var(--error)',
  normal: 'var(--accent)',
  low:    'var(--text-3)',
}

const PRIORITY_LABEL: Record<Todo['priority'], string> = {
  high: 'High', normal: 'Normal', low: 'Low',
}

function deadlineLabel(due: string): { text: string; color: string } {
  const date = parseISO(due)
  if (isToday(date)) return { text: 'Due today', color: 'var(--warning)' }
  if (isPast(date)) {
    const days = Math.abs(differenceInDays(new Date(), date))
    return { text: `${days}d overdue`, color: 'var(--error)' }
  }
  const days = differenceInDays(date, new Date())
  if (days <= 2) return { text: `${days}d left`, color: 'var(--warning)' }
  if (days <= 7) return { text: `${days}d left`, color: 'var(--accent)' }
  return { text: format(date, 'MMM d'), color: 'var(--text-3)' }
}

export default function TasksPage() {
  const [todos,    setTodos]    = useState<Todo[]>([])
  const [tab,      setTab]      = useState<Tab>('today')
  const [loading,  setLoading]  = useState(true)
  const [input,    setInput]    = useState('')
  const [priority, setPriority] = useState<Todo['priority']>('normal')
  const [deadline, setDeadline] = useState('')
  const [adding,   setAdding]   = useState(false)
  const [confirm,  setConfirm]  = useState<{ open: boolean; id?: string }>({ open: false })
  const [editId,   setEditId]   = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getTodos().then(d => { setTodos(d); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const todayTodos     = todos.filter(t => t.list === 'today'   && t.status === 'pending')
    .sort((a, b) => { const p = { high: 0, normal: 1, low: 2 }; return p[a.priority] - p[b.priority] })
  const backlogTodos   = todos.filter(t => t.list === 'backlog' && t.status === 'pending')
    .sort((a, b) => { const p = { high: 0, normal: 1, low: 2 }; return p[a.priority] - p[b.priority] })
  const completedTodos = todos.filter(t => t.status === 'completed')
    .sort((a, b) => (b.completed_at ?? '').localeCompare(a.completed_at ?? ''))

  const currentList = tab === 'today' ? todayTodos : tab === 'backlog' ? backlogTodos : completedTodos

  // Completion stats
  const todayTotal     = todayTodos.length + completedTodos.filter(t => t.completed_at && isToday(parseISO(t.completed_at))).length
  const todayCompleted = completedTodos.filter(t => t.completed_at && isToday(parseISO(t.completed_at))).length

  const handleAdd = async () => {
    if (!input.trim()) return
    setAdding(true)
    const targetList = tab === 'completed' ? 'today' : tab
    try {
      const todo = await addTodo({
        title: input.trim(), priority, list: targetList, status: 'pending',
        due_date: deadline || undefined,
      })
      setTodos(prev => [todo, ...prev])
      setInput(''); setDeadline('')
      toast.success(`Added to ${targetList === 'today' ? 'Today' : 'Backlog'}`)
      logActivity('todo', 'added', `Added task "${input.trim()}"`)
    } catch { toast.error('Failed to add') }
    finally { setAdding(false) }
  }

  const handleComplete = async (todo: Todo) => {
    await completeTodo(todo.id!)
    setTodos(prev => prev.map(t => t.id === todo.id
      ? { ...t, status: 'completed', completed_at: new Date().toISOString() }
      : t))
    toast.success('Done! 🎉')
    logActivity('todo', 'completed', `Completed "${todo.title}"`)
  }

  const handleSaveEdit = async (id: string, patch: Partial<Todo>) => {
    const existing = todos.find(t => t.id === id)
    await updateTodo(id, patch)
    setTodos(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t))
    setEditId(null)
    logActivity('todo', 'updated', `Updated task "${patch.title ?? existing?.title ?? id}"`)
  }

  const handleDelete = async () => {
    if (!confirm.id) return
    const target = todos.find(t => t.id === confirm.id)
    await deleteTodo(confirm.id)
    setTodos(prev => prev.filter(t => t.id !== confirm.id))
    setConfirm({ open: false })
    toast.success('Deleted')
    logActivity('todo', 'deleted', `Deleted task "${target?.title ?? confirm.id}"`)
  }

  const handleMove = async (todo: Todo, to: 'today' | 'backlog') => {
    await updateTodo(todo.id!, { list: to })
    setTodos(prev => prev.map(t => t.id === todo.id ? { ...t, list: to } : t))
    toast.success(`Moved to ${to === 'today' ? 'Today' : 'Backlog'}`)
    logActivity('todo', 'moved', `Moved "${todo.title}" to ${to === 'today' ? 'Today' : 'Backlog'}`)
  }

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'today',     label: 'Today',   count: todayTodos.length },
    { id: 'backlog',   label: 'Backlog', count: backlogTodos.length },
    { id: 'completed', label: 'Done',    count: completedTodos.length },
  ]

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid var(--accent)', borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite' }} />
    </div>
  )

  const completionPct = todayTotal > 0 ? Math.round((todayCompleted / todayTotal) * 100) : 0

  return (
    <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 720 }}>

      {/* ── Header + progress ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', animation: 'fade-up 0.18s ease both' }}>
        <div>
          <h1 className="title-lg">Tasks</h1>
          <p className="footnote" style={{ marginTop: 3 }}>
            {todayTodos.length} pending · {backlogTodos.length} in backlog
          </p>
        </div>

        {/* Today's completion mini-ring */}
        {todayTotal > 0 && (
          <div className="card" style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Mini donut */}
            <div style={{ position: 'relative', width: 44, height: 44, flexShrink: 0 }}>
              <svg width={44} height={44} style={{ transform: 'rotate(-90deg)', position: 'absolute', inset: 0 }}>
                <circle cx={22} cy={22} r={17} fill="none" stroke="var(--bg-3)" strokeWidth={5} />
                <circle cx={22} cy={22} r={17} fill="none"
                  stroke={completionPct === 100 ? 'var(--success)' : 'var(--accent)'}
                  strokeWidth={5}
                  strokeDasharray={`${(completionPct / 100) * 2 * Math.PI * 17} ${2 * Math.PI * 17}`}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dasharray 0.8s cubic-bezier(0.34,1.2,0.64,1)' }} />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {completionPct === 100
                  ? <CheckCircle2 size={14} color="var(--success)" />
                  : <span className="tabular-nums" style={{ fontSize: 11, fontWeight: 800, color: 'var(--accent)' }}>{completionPct}%</span>}
              </div>
            </div>
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: completionPct === 100 ? 'var(--success)' : 'var(--text-1)' }}>
                {todayCompleted}/{todayTotal}
              </p>
              <p className="footnote">today done</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: 4, padding: 3, background: 'var(--bg-2)', borderRadius: 'var(--r)', width: 'fit-content' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'default', fontSize: 13, fontWeight: 600,
              background: tab === t.id ? 'var(--surface)' : 'transparent',
              color: tab === t.id ? 'var(--text-1)' : 'var(--text-3)',
              boxShadow: tab === t.id ? '0 1px 4px rgba(0,0,0,0.12)' : 'none',
              transition: 'all 0.15s ease',
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
            {t.label}
            {t.count > 0 && (
              <span style={{
                fontSize: 10, fontWeight: 700, minWidth: 16, height: 16, borderRadius: 8, padding: '0 4px',
                background: tab === t.id ? 'var(--accent)' : 'var(--bg-3)',
                color: tab === t.id ? '#fff' : 'var(--text-3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Add input ── */}
      {tab !== 'completed' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {/* Priority selector */}
            <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
              {(['low', 'normal', 'high'] as const).map(p => (
                <button key={p} onClick={() => setPriority(p)} title={`${PRIORITY_LABEL[p]} priority`}
                  style={{
                    width: 28, height: 38, borderRadius: 8, border: 'none', cursor: 'default',
                    background: priority === p ? `color-mix(in srgb, ${PRIORITY_COLOR[p]} 15%, transparent)` : 'var(--bg-2)',
                    color: priority === p ? PRIORITY_COLOR[p] : 'var(--text-3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.15s',
                  }}>
                  <Flag size={11} strokeWidth={priority === p ? 2.5 : 1.8} />
                </button>
              ))}
            </div>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder={tab === 'today' ? 'What needs to get done today?' : 'Add to backlog…'}
              style={{
                flex: 1, height: 38, borderRadius: 'var(--r)', border: '1px solid var(--border)',
                padding: '0 12px', fontSize: 13, background: 'var(--surface)', color: 'var(--text-1)',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
              onBlur={e  => (e.currentTarget.style.borderColor = 'var(--border)')}
            />
            <button onClick={handleAdd} disabled={adding || !input.trim()}
              style={{
                width: 38, height: 38, borderRadius: 'var(--r)', background: 'var(--accent)', border: 'none',
                cursor: 'default', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, opacity: !input.trim() ? 0.4 : 1, transition: 'opacity 0.15s',
              }}>
              <Plus size={14} />
            </button>
          </div>
          {/* Optional deadline */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingLeft: 90 }}>
            <CalendarDays size={11} color="var(--text-3)" />
            <input
              type="date"
              value={deadline}
              min={format(new Date(), 'yyyy-MM-dd')}
              onChange={e => setDeadline(e.target.value)}
              style={{
                height: 28, fontSize: 11, borderRadius: 7, border: '1px solid var(--border)',
                padding: '0 8px', background: 'var(--bg-2)', color: deadline ? 'var(--text-2)' : 'var(--text-3)',
                cursor: 'default',
              }}
            />
            <span style={{ fontSize: 10, color: 'var(--text-3)' }}>optional deadline</span>
            {deadline && (
              <button onClick={() => setDeadline('')}
                style={{ width: 18, height: 18, borderRadius: '50%', border: 'none', background: 'var(--bg-3)', cursor: 'default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={9} color="var(--text-3)" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Task list ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {currentList.length === 0 ? (
          <div style={{ padding: '44px 0', textAlign: 'center', color: 'var(--text-3)', animation: 'fade-up 0.2s ease both' }}>
            <p style={{ fontSize: 28, marginBottom: 8 }}>
              {tab === 'today' ? '✅' : tab === 'backlog' ? '📥' : '🎉'}
            </p>
            <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-2)' }}>
              {tab === 'today' ? 'Clear for today' : tab === 'backlog' ? 'Backlog empty' : 'Nothing completed yet'}
            </p>
            <p className="footnote" style={{ marginTop: 4 }}>
              {tab === 'today' ? 'Add something or pull from backlog' : tab === 'backlog' ? 'Dump ideas and tasks here' : 'Complete tasks to see them here'}
            </p>
          </div>
        ) : (
          currentList.map((todo, i) => (
            editId === todo.id
              ? <EditRow key={todo.id} todo={todo} index={i}
                  onSave={patch => handleSaveEdit(todo.id!, patch)}
                  onCancel={() => setEditId(null)} />
              : <TodoRow key={todo.id} todo={todo} tab={tab} index={i}
                  onComplete={() => handleComplete(todo)}
                  onDelete={() => setConfirm({ open: true, id: todo.id })}
                  onMove={to => handleMove(todo, to)}
                  onEdit={() => setEditId(todo.id!)} />
          ))
        )}
      </div>

      <ConfirmDialog
        open={confirm.open}
        title="Delete task?"
        message="This task will be permanently removed."
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setConfirm({ open: false })}
      />
    </div>
  )
}

// ── Todo row ─────────────────────────────────────────────────────
function TodoRow({ todo, tab, index, onComplete, onDelete, onMove, onEdit }: {
  todo: Todo; tab: Tab; index: number
  onComplete: () => void; onDelete: () => void
  onMove: (to: 'today' | 'backlog') => void; onEdit: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const done = todo.status === 'completed'
  const dl = todo.due_date ? deadlineLabel(todo.due_date) : null

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 10px', borderRadius: 'var(--r)',
        background: hovered ? 'var(--bg-2)' : 'transparent',
        border: `1px solid ${hovered ? 'var(--border-2)' : 'transparent'}`,
        transition: 'all 0.12s ease',
        animation: `fade-up 0.16s ${index * 0.025}s ease both`,
      }}>

      {/* Complete circle */}
      {done ? (
        <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Check size={11} color="white" strokeWidth={2.5} />
        </div>
      ) : (
        <button onClick={onComplete}
          style={{
            width: 20, height: 20, borderRadius: '50%', border: `1.5px solid ${PRIORITY_COLOR[todo.priority]}`,
            background: 'transparent', cursor: 'default', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.12s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = `color-mix(in srgb, ${PRIORITY_COLOR[todo.priority]} 12%, transparent)`)}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        />
      )}

      {/* Priority dot */}
      <div style={{ width: 5, height: 5, borderRadius: '50%', background: PRIORITY_COLOR[todo.priority], flexShrink: 0, opacity: done ? 0.25 : 1 }} />

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: 14, fontWeight: 500, color: done ? 'var(--text-3)' : 'var(--text-1)',
          textDecoration: done ? 'line-through' : 'none',
          overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
        }}>{todo.title}</p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2, flexWrap: 'wrap' }}>
          {done && todo.completed_at && (
            <span className="footnote" style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Clock size={9} />{format(parseISO(todo.completed_at), 'MMM d, h:mm a')}
            </span>
          )}
          {dl && !done && (
            <span style={{ fontSize: 10, fontWeight: 600, color: dl.color, display: 'flex', alignItems: 'center', gap: 3 }}>
              <CalendarDays size={9} />{dl.text}
            </span>
          )}
          {todo.notes && !done && (
            <span className="footnote" style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', maxWidth: 200 }}>
              {todo.notes}
            </span>
          )}
        </div>
      </div>

      {/* Actions (appear on hover) */}
      {hovered && (
        <div style={{ display: 'flex', gap: 2, flexShrink: 0, animation: 'fade-up 0.1s ease both' }}>
          {!done && <ActionBtn icon={<Pencil size={11} />} label="Edit" onClick={onEdit} />}
          {!done && tab === 'today' && (
            <ActionBtn icon={<ArrowDownToLine size={11} />} label="To Backlog" onClick={() => onMove('backlog')} />
          )}
          {!done && tab === 'backlog' && (
            <ActionBtn icon={<ArrowUpToLine size={11} />} label="To Today" onClick={() => onMove('today')} />
          )}
          <ActionBtn icon={<Trash2 size={11} />} label="Delete" onClick={onDelete} danger />
        </div>
      )}
    </div>
  )
}

// ── Inline edit row ───────────────────────────────────────────────
function EditRow({ todo, index, onSave, onCancel }: {
  todo: Todo; index: number
  onSave: (patch: Partial<Todo>) => void; onCancel: () => void
}) {
  const [title,    setTitle]    = useState(todo.title)
  const [priority, setPriority] = useState<Todo['priority']>(todo.priority)
  const [deadline, setDeadline] = useState(todo.due_date ?? '')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const save = () => {
    if (!title.trim()) return
    onSave({ title: title.trim(), priority, due_date: deadline || undefined })
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 8,
      padding: '12px 10px', borderRadius: 'var(--r)',
      background: 'var(--bg-2)', border: '1px solid var(--accent)',
      animation: `fade-up 0.12s ${index * 0.025}s ease both`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Priority */}
        <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
          {(['low', 'normal', 'high'] as const).map(p => (
            <button key={p} onClick={() => setPriority(p)} title={`${PRIORITY_LABEL[p]} priority`}
              style={{
                width: 26, height: 32, borderRadius: 7, border: 'none', cursor: 'default',
                background: priority === p ? `color-mix(in srgb, ${PRIORITY_COLOR[p]} 15%, transparent)` : 'transparent',
                color: priority === p ? PRIORITY_COLOR[p] : 'var(--text-3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.12s',
              }}>
              <Flag size={10} strokeWidth={priority === p ? 2.5 : 1.8} />
            </button>
          ))}
        </div>
        <input
          ref={inputRef}
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') onCancel() }}
          style={{
            flex: 1, height: 34, borderRadius: 8, border: '1px solid var(--accent)',
            padding: '0 10px', fontSize: 13, background: 'var(--surface)', color: 'var(--text-1)',
          }}
        />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 88 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <CalendarDays size={11} color="var(--text-3)" />
          <input
            type="date"
            value={deadline}
            onChange={e => setDeadline(e.target.value)}
            style={{
              height: 26, fontSize: 11, borderRadius: 6, border: '1px solid var(--border)',
              padding: '0 7px', background: 'var(--bg-2)', color: deadline ? 'var(--text-2)' : 'var(--text-3)',
              cursor: 'default',
            }}
          />
          {deadline && (
            <button onClick={() => setDeadline('')}
              style={{ width: 16, height: 16, borderRadius: '50%', border: 'none', background: 'var(--bg-3)', cursor: 'default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={8} color="var(--text-3)" />
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 5, marginLeft: 'auto' }}>
          <button onClick={onCancel}
            style={{ height: 28, padding: '0 10px', borderRadius: 7, border: '1px solid var(--border)', background: 'transparent', cursor: 'default', fontSize: 12, color: 'var(--text-3)' }}>
            Cancel
          </button>
          <button onClick={save} disabled={!title.trim()}
            style={{ height: 28, padding: '0 12px', borderRadius: 7, border: 'none', background: 'var(--accent)', cursor: 'default', fontSize: 12, fontWeight: 700, color: '#fff', opacity: !title.trim() ? 0.4 : 1 }}>
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

function ActionBtn({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} title={label}
      style={{
        width: 26, height: 26, borderRadius: 6, border: 'none', cursor: 'default',
        background: 'var(--bg-3)', color: danger ? 'var(--error)' : 'var(--text-2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.12s',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = danger ? 'color-mix(in srgb, var(--error) 12%, transparent)' : 'var(--bg-2)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-3)')}>
      {icon}
    </button>
  )
}
