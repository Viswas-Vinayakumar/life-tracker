'use client'

import { useState, useEffect } from 'react'
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'
import { TrendingUp, TrendingDown, PiggyBank, Plus, X } from 'lucide-react'
import type { FinancialEntry } from '@/types'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/types'
import { getFinanceEntries, addFinanceEntry, deleteFinanceEntry } from '@/lib/db'
import { toast } from 'sonner'
import ConfirmDialog from '@/components/ui/ConfirmDialog'

const PIE_COLORS = ['#a78bfa', '#38bdf8', '#34d399', '#fbbf24', '#f87171', '#818cf8', '#ec4899', '#14b8a6']
const now = new Date()
const thisMonth = format(now, 'yyyy-MM')

function ChartTip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="card" style={{ padding: '8px 12px', fontSize: 12 }}>
      <p className="footnote" style={{ marginBottom: 4 }}>{label}</p>
      {payload.map(p => <p key={p.name} style={{ fontWeight: 600 }}>{p.name}: ₹{p.value.toLocaleString()}</p>)}
    </div>
  )
}

export default function FinancePage() {
  const [entries, setEntries] = useState<FinancialEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [type, setType] = useState<'expense' | 'income'>('expense')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('Food & Dining')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(format(now, 'yyyy-MM-dd'))
  const [saving, setSaving] = useState(false)
  const [confirm, setConfirm] = useState<{ open: boolean; id?: string }>({ open: false })

  useEffect(() => {
    getFinanceEntries(thisMonth)
      .then(data => { setEntries(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const totalIncome = entries.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0)
  const totalExpense = entries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0)
  const net = totalIncome - totalExpense
  const savingsRate = totalIncome > 0 ? Math.round((net / totalIncome) * 100) : 0

  const expenseByCategory = entries.filter(e => e.type === 'expense')
    .reduce<Record<string, number>>((acc, e) => { acc[e.category] = (acc[e.category] ?? 0) + e.amount; return acc }, {})
  const pieData = Object.entries(expenseByCategory).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }))

  const daysInMonth: string[] = []
  for (let d = new Date(startOfMonth(now)); d <= endOfMonth(now); d.setDate(d.getDate() + 1)) {
    daysInMonth.push(format(d, 'yyyy-MM-dd'))
  }
  const dailyData = daysInMonth.map(day => ({
    date: format(parseISO(day), 'd'),
    income: entries.filter(e => e.date === day && e.type === 'income').reduce((s, e) => s + e.amount, 0),
    expense: entries.filter(e => e.date === day && e.type === 'expense').reduce((s, e) => s + e.amount, 0),
  })).filter(d => d.income > 0 || d.expense > 0)

  const handleAdd = async () => {
    if (!amount || isNaN(parseFloat(amount))) return
    setSaving(true)
    try {
      const entry = await addFinanceEntry({ date, type, amount: parseFloat(amount), category, description: description || undefined })
      setEntries(prev => [entry, ...prev])
      setAmount(''); setDescription(''); setShowAdd(false)
      toast.success(`${type === 'income' ? 'Income' : 'Expense'} logged!`)
    } catch { toast.error('Failed') }
    finally { setSaving(false) }
  }

  const handleRemove = async () => {
    if (!confirm.id) return
    await deleteFinanceEntry(confirm.id)
    setEntries(prev => prev.filter(e => e.id !== confirm.id))
    setConfirm({ open: false })
    toast.success('Entry deleted')
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 12, color: 'var(--text-3)' }}>
      <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid var(--accent)', borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite' }} />
    </div>
  )

  return (
    <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 className="title-lg">Finance</h1>
          <p className="footnote" style={{ marginTop: 4 }}>{format(now, 'MMMM yyyy')}</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
            borderRadius: 'var(--r)', background: 'var(--accent)', border: 'none', cursor: 'default',
            color: '#fff', fontSize: 13, fontWeight: 600,
          }}>
          <Plus size={13} />Add
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10, animation: 'fade-up 0.18s ease both' }}>
          {/* Type toggle */}
          <div style={{ display: 'flex', gap: 6 }}>
            {(['expense', 'income'] as const).map(t => (
              <button key={t}
                onClick={() => { setType(t); setCategory(t === 'expense' ? 'Food & Dining' : 'Salary') }}
                style={{
                  flex: 1, padding: '7px 0', borderRadius: 'var(--r)', border: 'none', cursor: 'default', fontSize: 13, fontWeight: 600,
                  background: type === t
                    ? t === 'expense' ? 'color-mix(in srgb, var(--error) 12%, transparent)' : 'color-mix(in srgb, var(--success) 12%, transparent)'
                    : 'var(--bg-2)',
                  color: type === t ? (t === 'expense' ? 'var(--error)' : 'var(--success)') : 'var(--text-3)',
                  outline: type === t ? `1.5px solid ${t === 'expense' ? 'var(--error)' : 'var(--success)'}` : 'none',
                  transition: 'all 0.15s ease',
                }}>
                {t === 'expense' ? 'Expense' : 'Income'}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', fontSize: 14, fontWeight: 600 }}>₹</span>
              <input type="number" placeholder="0" value={amount} onChange={e => setAmount(e.target.value)} autoFocus
                style={{ width: '100%', height: 36, borderRadius: 'var(--r)', border: '1px solid var(--border)', paddingLeft: 24, paddingRight: 10, fontSize: 13, background: 'var(--bg-2)', color: 'var(--text-1)' }} />
            </div>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              style={{ width: 150, height: 36, borderRadius: 'var(--r)', border: '1px solid var(--border)', padding: '0 10px', fontSize: 12, background: 'var(--bg-2)', color: 'var(--text-1)' }} />
          </div>

          <select value={category} onChange={e => setCategory(e.target.value)}
            style={{ height: 36, borderRadius: 'var(--r)', border: '1px solid var(--border)', padding: '0 10px', fontSize: 13, background: 'var(--bg-2)', color: 'var(--text-1)' }}>
            {(type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <input placeholder="Description (optional)" value={description}
            onChange={e => setDescription(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdd()}
            style={{ height: 36, borderRadius: 'var(--r)', border: '1px solid var(--border)', padding: '0 12px', fontSize: 13, background: 'var(--bg-2)', color: 'var(--text-1)' }} />

          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setShowAdd(false)}
              style={{ flex: 1, height: 34, borderRadius: 'var(--r)', border: '1px solid var(--border)', background: 'none', cursor: 'default', fontSize: 13, color: 'var(--text-2)' }}>
              Cancel
            </button>
            <button onClick={handleAdd} disabled={saving || !amount}
              style={{ flex: 1, height: 34, borderRadius: 'var(--r)', border: 'none', background: 'var(--accent)', cursor: 'default', fontSize: 13, fontWeight: 600, color: '#fff', opacity: !amount ? 0.5 : 1 }}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        {[
          { icon: <TrendingUp size={12} />, label: 'Income', value: `₹${totalIncome.toLocaleString()}`, color: 'var(--success)', bg: 'color-mix(in srgb, var(--success) 10%, transparent)' },
          { icon: <TrendingDown size={12} />, label: 'Spent', value: `₹${totalExpense.toLocaleString()}`, color: 'var(--error)', bg: 'color-mix(in srgb, var(--error) 10%, transparent)' },
          { icon: <PiggyBank size={12} />, label: 'Net', value: `${net >= 0 ? '+' : ''}₹${net.toLocaleString()}`, color: net >= 0 ? 'var(--success)' : 'var(--error)', bg: `color-mix(in srgb, ${net >= 0 ? 'var(--success)' : 'var(--error)'} 10%, transparent)` },
          { icon: null, label: 'Saved', value: `${savingsRate}%`, color: savingsRate >= 20 ? 'var(--success)' : savingsRate >= 0 ? 'var(--warning)' : 'var(--error)', bg: 'var(--bg-2)' },
        ].map(({ icon, label, value, color, bg }) => (
          <div key={label} className="card" style={{ padding: '12px 14px', background: bg }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color, marginBottom: 4 }}>
              {icon}
              <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-3)' }}>{label}</span>
            </div>
            <p className="tabular-nums" style={{ fontSize: 17, fontWeight: 700, color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'var(--border-2)' }} />

      {/* Charts */}
      {(dailyData.length > 0 || pieData.length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {dailyData.length > 0 && (
            <section>
              <p className="section-label">Daily Cashflow</p>
              <div className="card" style={{ padding: '14px 14px 10px' }}>
                <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                  {[{ c: 'var(--success)', l: 'Income' }, { c: 'var(--error)', l: 'Expense' }].map(d => (
                    <div key={d.l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: d.c }} />
                      <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{d.l}</span>
                    </div>
                  ))}
                </div>
                <ResponsiveContainer width="100%" height={110}>
                  <BarChart data={dailyData} margin={{ top: 0, right: 2, bottom: 0, left: -22 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-2)" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} />
                    <Tooltip content={<ChartTip />} />
                    <Bar dataKey="income" name="Income" fill="var(--success)" radius={[3, 3, 0, 0]} maxBarSize={10} />
                    <Bar dataKey="expense" name="Expense" fill="var(--error)" radius={[3, 3, 0, 0]} maxBarSize={10} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          )}

          {pieData.length > 0 && (
            <section>
              <p className="section-label">Spending</p>
              <div className="card" style={{ padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <PieChart width={100} height={100}>
                    <Pie data={pieData} cx={45} cy={45} innerRadius={26} outerRadius={44} dataKey="value" strokeWidth={0}>
                      {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                  </PieChart>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {pieData.slice(0, 5).map((d, i) => (
                      <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                        <span style={{ fontSize: 11, color: 'var(--text-3)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', flex: 1 }}>{d.name}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, flexShrink: 0 }}>₹{d.value.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      )}

      {/* Divider */}
      <div style={{ height: 1, background: 'var(--border-2)' }} />

      {/* Transactions */}
      <section>
        <p className="section-label">Transactions</p>
        {entries.length === 0 ? (
          <div className="card" style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
            No transactions this month
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[...entries].sort((a, b) => b.date.localeCompare(a.date)).map(entry => (
              <div key={entry.id}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 'var(--r)', border: '1px solid transparent', transition: 'all 0.12s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-2)'; (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-2)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; (e.currentTarget as HTMLDivElement).style.borderColor = 'transparent' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    background: entry.type === 'income' ? 'color-mix(in srgb, var(--success) 12%, transparent)' : 'color-mix(in srgb, var(--error) 12%, transparent)',
                  }}>
                    {entry.type === 'income'
                      ? <TrendingUp size={12} color="var(--success)" />
                      : <TrendingDown size={12} color="var(--error)" />}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                      {entry.description ?? entry.category}
                    </p>
                    <p className="footnote">{entry.category} · {format(parseISO(entry.date), 'MMM d')}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <span className="tabular-nums" style={{ fontSize: 13, fontWeight: 700, color: entry.type === 'income' ? 'var(--success)' : 'var(--text-1)' }}>
                    {entry.type === 'income' ? '+' : '−'}₹{entry.amount.toLocaleString()}
                  </span>
                  <button onClick={() => setConfirm({ open: true, id: entry.id! })}
                    style={{ width: 24, height: 24, borderRadius: 6, border: 'none', cursor: 'default', background: 'none', color: 'var(--text-3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <X size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <ConfirmDialog
        open={confirm.open}
        title="Delete transaction?"
        message="This entry will be permanently removed from your financial records."
        confirmLabel="Delete"
        danger
        onConfirm={handleRemove}
        onCancel={() => setConfirm({ open: false })}
      />
    </div>
  )
}
