'use client'

import { useState, useEffect, useRef } from 'react'
import { Plus, Check, Trash2, ArrowDownToLine, ArrowUpToLine, Flag, Clock } from 'lucide-react'
import { toast } from 'sonner'
import { getTodos, addTodo, updateTodo, deleteTodo, completeTodo } from '@/lib/db'
import type { Todo } from '@/types'
import { format, parseISO } from 'date-fns'
import ConfirmDialog from '@/components/ui/ConfirmDialog'

type Tab = 'today' | 'backlog' | 'completed'

const PRIORITY_COLOR: Record<Todo['priority'], string> = {
  high: 'var(--error)',
  normal: 'var(--accent)',
  low: 'var(--text-3)',
}

export default function TasksPage() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [tab, setTab] = useState<Tab>('today')
  const [loading, setLoading] = useState(true)
  const [input, setInput] = useState('')
  const [priority, setPriority] = useState<Todo['priority']>('normal')
  const [adding, setAdding] = useState(false)
  const [confirm, setConfirm] = useState<{ open: boolean; id?: string }>({ open: false })
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getTodos().then(d => { setTodos(d); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const todayTodos = todos.filter(t => t.list === 'today' && t.status === 'pending')
    .sort((a, b) => { const p = { high: 0, normal: 1, low: 2 }; return p[a.priority] - p[b.priority] })
  const backlogTodos = todos.filter(t => t.list === 'backlog' && t.status === 'pending')
    .sort((a, b) => { const p = { high: 0, normal: 1, low: 2 }; return p[a.priority] - p[b.priority] })
  const completedTodos = todos.filter(t => t.status === 'completed')
    .sort((a, b) => (b.completed_at ?? '').localeCompare(a.completed_at ?? ''))

  const currentList = tab === 'today' ? todayTodos : tab === 'backlog' ? backlogTodos : completedTodos

  const handleAdd = async () => {
    if (!input.trim()) return
    setAdding(true)
    const targetList = tab === 'completed' ? 'today' : tab
    try {
      const todo = await addTodo({ title: input.trim(), priority, list: targetList, status: 'pending' })
      setTodos(prev => [todo, ...prev])
      setInput('')
      toast.success(`Added to ${targetList === 'today' ? 'Today' : 'Backlog'}`)
    } catch { toast.error('Failed to add') }
    finally { setAdding(false) }
  }

  const handleComplete = async (todo: Todo) => {
    await completeTodo(todo.id!)
    setTodos(prev => prev.map(t => t.id === todo.id ? { ...t, status: 'completed', completed_at: new Date().toISOString() } : t))
    toast.success('Done! 🎉')
  }

  const confirmDelete = (id: string) => setConfirm({ open: true, id })

  const handleDelete = async () => {
    if (!confirm.id) return
    await deleteTodo(confirm.id)
    setTodos(prev => prev.filter(t => t.id !== confirm.id))
    setConfirm({ open: false })
    toast.success('Deleted')
  }

  const handleMove = async (todo: Todo, to: 'today' | 'backlog') => {
    await updateTodo(todo.id!, { list: to })
    setTodos(prev => prev.map(t => t.id === todo.id ? { ...t, list: to } : t))
    toast.success(`Moved to ${to === 'today' ? 'Today' : 'Backlog'}`)
  }

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'today', label: 'Today', count: todayTodos.length },
    { id: 'backlog', label: 'Backlog', count: backlogTodos.length },
    { id: 'completed', label: 'Done', count: completedTodos.length },
  ]

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 12, color: 'var(--text-3)' }}>
      <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid var(--accent)', borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite' }} />
    </div>
  )

  return (
    <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 680 }}>
      {/* Header */}
      <div>
        <h1 className="title-lg">Tasks</h1>
        <p className="footnote" style={{ marginTop: 4 }}>
          {todayTodos.length} today · {backlogTodos.length} in backlog
        </p>
      </div>

      {/* Tabs */}
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

      {/* Add input */}
      {tab !== 'completed' && (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
            {(['low', 'normal', 'high'] as const).map(p => (
              <button key={p} onClick={() => setPriority(p)} title={`${p} priority`}
                style={{
                  width: 28, height: 36, borderRadius: 8, border: 'none', cursor: 'default',
                  background: priority === p ? `color-mix(in srgb, ${PRIORITY_COLOR[p]} 15%, transparent)` : 'var(--bg-2)',
                  color: priority === p ? PRIORITY_COLOR[p] : 'var(--text-3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
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
            placeholder={tab === 'today' ? 'What needs to get done today?' : 'Dump a thought or task…'}
            style={{
              flex: 1, height: 36, borderRadius: 'var(--r)', border: '1px solid var(--border)',
              padding: '0 12px', fontSize: 13, background: 'var(--surface)', color: 'var(--text-1)',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
            onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
          />
          <button onClick={handleAdd} disabled={adding || !input.trim()}
            style={{
              width: 36, height: 36, borderRadius: 'var(--r)', background: 'var(--accent)', border: 'none',
              cursor: 'default', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, opacity: !input.trim() ? 0.4 : 1,
            }}>
            <Plus size={14} />
          </button>
        </div>
      )}

      {/* Task list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {currentList.length === 0 ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-3)' }}>
            <p style={{ fontSize: 28, marginBottom: 8 }}>
              {tab === 'today' ? '✅' : tab === 'backlog' ? '📥' : '🎉'}
            </p>
            <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-2)' }}>
              {tab === 'today' ? 'Nothing for today' : tab === 'backlog' ? 'Backlog is empty' : 'Nothing completed yet'}
            </p>
            <p className="footnote" style={{ marginTop: 4 }}>
              {tab === 'today' ? 'Add something or move from backlog' : tab === 'backlog' ? 'Dump ideas, tasks, anything' : 'Complete tasks to see them here'}
            </p>
          </div>
        ) : (
          currentList.map((todo, i) => (
            <TodoRow key={todo.id} todo={todo} tab={tab} index={i}
              onComplete={() => handleComplete(todo)}
              onDelete={() => confirmDelete(todo.id!)}
              onMove={to => handleMove(todo, to)}
            />
          ))
        )}
      </div>

      <ConfirmDialog
        open={confirm.open}
        title="Delete task?"
        message="This task will be permanently removed and cannot be recovered."
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setConfirm({ open: false })}
      />
    </div>
  )
}

function TodoRow({ todo, tab, index, onComplete, onDelete, onMove }: {
  todo: Todo; tab: Tab; index: number
  onComplete: () => void; onDelete: () => void; onMove: (to: 'today' | 'backlog') => void
}) {
  const [hovered, setHovered] = useState(false)
  const done = todo.status === 'completed'

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 10px', borderRadius: 'var(--r)',
        background: hovered ? 'var(--bg-2)' : 'transparent',
        border: '1px solid transparent',
        borderColor: hovered ? 'var(--border-2)' : 'transparent',
        transition: 'all 0.12s ease',
        animation: `fade-up 0.16s ${index * 0.025}s ease both`,
      }}>
      {/* Check circle */}
      {done ? (
        <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Check size={11} color="white" strokeWidth={2.5} />
        </div>
      ) : (
        <button onClick={onComplete}
          style={{
            width: 20, height: 20, borderRadius: '50%', border: `1.5px solid ${PRIORITY_COLOR[todo.priority]}`,
            background: 'transparent', cursor: 'default', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
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
        {done && todo.completed_at && (
          <p className="footnote" style={{ marginTop: 1, display: 'flex', alignItems: 'center', gap: 3 }}>
            <Clock size={9} />
            {format(parseISO(todo.completed_at), 'MMM d, h:mm a')}
          </p>
        )}
        {todo.notes && !done && (
          <p className="footnote" style={{ marginTop: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
            {todo.notes}
          </p>
        )}
      </div>

      {/* Actions */}
      {hovered && (
        <div style={{ display: 'flex', gap: 2, flexShrink: 0, animation: 'fade-up 0.1s ease both' }}>
          {!done && tab === 'today' && (
            <ActionBtn icon={<ArrowDownToLine size={11} />} label="Move to Backlog" onClick={() => onMove('backlog')} />
          )}
          {!done && tab === 'backlog' && (
            <ActionBtn icon={<ArrowUpToLine size={11} />} label="Move to Today" onClick={() => onMove('today')} />
          )}
          <ActionBtn icon={<Trash2 size={11} />} label="Delete" onClick={onDelete} danger />
        </div>
      )}
    </div>
  )
}

function ActionBtn({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} title={label}
      style={{
        width: 26, height: 26, borderRadius: 6, border: 'none', cursor: 'default',
        background: 'var(--bg-3)', color: danger ? 'var(--error)' : 'var(--text-2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = danger ? 'color-mix(in srgb, var(--error) 12%, transparent)' : 'var(--bg-2)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-3)')}>
      {icon}
    </button>
  )
}
