'use client'

import { useState, useEffect } from 'react'
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'
import { TrendingUp, TrendingDown, PiggyBank, Plus, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import type { FinancialEntry } from '@/types'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/types'
import { toast } from 'sonner'

const PIE_COLORS = ['#7c3aed', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6']

const now = new Date()
const thisMonth = format(now, 'yyyy-MM')
const thisMonthLabel = format(now, 'MMMM yyyy')

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2 text-xs space-y-1">
      <p className="text-muted-foreground font-medium">{label}</p>
      {payload.map(p => (
        <p key={p.name} className="font-bold">
          {p.name}: ₹{p.value.toLocaleString()}
        </p>
      ))}
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

  useEffect(() => {
    fetch(`/api/finance?month=${thisMonth}`)
      .then(r => r.json())
      .then(data => { setEntries(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const totalIncome = entries.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0)
  const totalExpense = entries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0)
  const net = totalIncome - totalExpense
  const savingsRate = totalIncome > 0 ? Math.round((net / totalIncome) * 100) : 0

  // Group expenses by category
  const expenseByCategory = entries
    .filter(e => e.type === 'expense')
    .reduce<Record<string, number>>((acc, e) => {
      acc[e.category] = (acc[e.category] ?? 0) + e.amount
      return acc
    }, {})

  const pieData = Object.entries(expenseByCategory)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }))

  // Daily cashflow for the month
  const daysInMonth: string[] = []
  const start = startOfMonth(now)
  const end = endOfMonth(now)
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    daysInMonth.push(format(d, 'yyyy-MM-dd'))
  }

  const dailyData = daysInMonth.map(day => {
    const dayEntries = entries.filter(e => e.date === day)
    return {
      date: format(parseISO(day), 'd'),
      income: dayEntries.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0),
      expense: dayEntries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0),
    }
  }).filter(d => d.income > 0 || d.expense > 0)

  const handleAdd = async () => {
    if (!amount || isNaN(parseFloat(amount))) return
    setSaving(true)
    try {
      const res = await fetch('/api/finance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, type, amount: parseFloat(amount), category, description: description || undefined }),
      })
      const entry = await res.json()
      setEntries(prev => [entry, ...prev])
      setAmount('')
      setDescription('')
      setShowAdd(false)
      toast.success(`${type === 'income' ? 'Income' : 'Expense'} logged!`)
    } catch { toast.error('Failed') }
    finally { setSaving(false) }
  }

  const handleRemove = async (id: string) => {
    await fetch(`/api/finance?id=${id}`, { method: 'DELETE' })
    setEntries(prev => prev.filter(e => e.id !== id))
    toast.success('Entry removed')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-dvh">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="px-4 pt-6 pb-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Finance</h1>
          <p className="text-sm text-muted-foreground">{thisMonthLabel}</p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-2 rounded-xl text-sm font-medium">
          <Plus size={14} />
          Add
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="bg-card rounded-2xl p-4 border border-border space-y-3 slide-up">
          <div className="flex gap-2">
            {(['expense', 'income'] as const).map(t => (
              <button key={t}
                onClick={() => { setType(t); setCategory(t === 'expense' ? 'Food & Dining' : 'Salary') }}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                  type === t
                    ? t === 'expense' ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-secondary border border-transparent text-muted-foreground'
                }`}>
                {t === 'expense' ? 'Expense' : 'Income'}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
              <Input type="number" placeholder="0" value={amount} onChange={e => setAmount(e.target.value)}
                className="pl-7 bg-secondary border-border" autoFocus />
            </div>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-[140px] bg-secondary border-border text-sm" />
          </div>
          <Select value={category} onValueChange={(v) => v && setCategory(v)}>
            <SelectTrigger className="bg-secondary border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input placeholder="Description (optional)" value={description}
            onChange={e => setDescription(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            className="bg-secondary border-border" />
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowAdd(false)} className="flex-1 border-border">Cancel</Button>
            <Button onClick={handleAdd} disabled={saving || !amount} className="flex-1 bg-primary">Save</Button>
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={16} className="text-green-400" />
            <span className="text-xs text-muted-foreground">Total Income</span>
          </div>
          <p className="text-xl font-bold text-green-400 tabular-nums">₹{totalIncome.toLocaleString()}</p>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown size={16} className="text-red-400" />
            <span className="text-xs text-muted-foreground">Total Spent</span>
          </div>
          <p className="text-xl font-bold text-red-400 tabular-nums">₹{totalExpense.toLocaleString()}</p>
        </div>
        <div className={`border rounded-2xl p-4 ${net >= 0 ? 'bg-primary/10 border-primary/20' : 'bg-red-500/10 border-red-500/20'}`}>
          <div className="flex items-center gap-2 mb-2">
            <PiggyBank size={16} className={net >= 0 ? 'text-primary' : 'text-red-400'} />
            <span className="text-xs text-muted-foreground">Net Savings</span>
          </div>
          <p className={`text-xl font-bold tabular-nums ${net >= 0 ? 'text-primary' : 'text-red-400'}`}>
            {net >= 0 ? '+' : ''}₹{net.toLocaleString()}
          </p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-xs text-muted-foreground mb-2">Savings Rate</p>
          <p className={`text-xl font-bold tabular-nums ${savingsRate >= 20 ? 'text-green-400' : savingsRate >= 0 ? 'text-yellow-400' : 'text-red-400'}`}>
            {savingsRate}%
          </p>
          <div className="mt-2 h-1.5 bg-secondary rounded-full overflow-hidden">
            <div className="h-full bg-green-400 rounded-full transition-all duration-700"
              style={{ width: `${Math.min(100, Math.max(0, savingsRate))}%` }} />
          </div>
        </div>
      </div>

      <Separator className="bg-border" />

      {/* Daily cashflow chart */}
      {dailyData.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-bold">Daily Cashflow</h2>
          <div className="bg-card rounded-2xl p-4 border border-border">
            <div className="flex gap-4 mb-3">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-green-500" />
                <span className="text-xs text-muted-foreground">Income</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-red-400" />
                <span className="text-xs text-muted-foreground">Expense</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={dailyData} margin={{ top: 0, right: 4, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="income" fill="#22c55e" radius={[3, 3, 0, 0]} maxBarSize={12} name="Income" />
                <Bar dataKey="expense" fill="#f87171" radius={[3, 3, 0, 0]} maxBarSize={12} name="Expense" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* Expense by category pie */}
      {pieData.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-bold">Spending Breakdown</h2>
          <div className="bg-card rounded-2xl p-4 border border-border">
            <div className="flex items-center gap-4">
              <div className="shrink-0">
                <PieChart width={130} height={130}>
                  <Pie data={pieData} cx={60} cy={60} innerRadius={32} outerRadius={55}
                    dataKey="value" strokeWidth={0}>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </div>
              <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                {pieData.slice(0, 6).map((d, i) => (
                  <div key={d.name} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-xs text-muted-foreground truncate">{d.name}</span>
                    </div>
                    <span className="text-xs font-bold shrink-0">₹{d.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      <Separator className="bg-border" />

      {/* Transaction list */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold">All Transactions</h2>
        {entries.length === 0 ? (
          <div className="bg-card rounded-2xl p-8 border border-border text-center text-muted-foreground text-sm">
            No transactions this month — add your first one!
          </div>
        ) : (
          <div className="space-y-2">
            {entries
              .sort((a, b) => b.date.localeCompare(a.date))
              .map(entry => (
                <div key={entry.id}
                  className="flex items-center justify-between bg-card rounded-xl px-3 py-3 border border-border group">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      entry.type === 'income' ? 'bg-green-500/15' : 'bg-red-500/15'
                    }`}>
                      {entry.type === 'income' ? (
                        <TrendingUp size={14} className="text-green-400" />
                      ) : (
                        <TrendingDown size={14} className="text-red-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{entry.description ?? entry.category}</p>
                      <p className="text-xs text-muted-foreground">{entry.category} · {format(parseISO(entry.date), 'MMM d')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-sm font-bold tabular-nums ${
                      entry.type === 'income' ? 'text-green-400' : 'text-foreground'
                    }`}>
                      {entry.type === 'income' ? '+' : '-'}₹{entry.amount.toLocaleString()}
                    </span>
                    <button onClick={() => handleRemove(entry.id!)}
                      className="p-1 rounded-lg text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all">
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </section>
    </div>
  )
}
