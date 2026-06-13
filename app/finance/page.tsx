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
import { getFinanceEntries, addFinanceEntry, deleteFinanceEntry } from '@/lib/db'
import { toast } from 'sonner'

const PIE_COLORS = ['#a78bfa', '#38bdf8', '#34d399', '#fbbf24', '#f87171', '#818cf8', '#ec4899', '#14b8a6']
const now = new Date()
const thisMonth = format(now, 'yyyy-MM')

function Tip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2 text-[12px] shadow-xl space-y-1">
      <p className="text-muted-foreground font-medium">{label}</p>
      {payload.map(p => <p key={p.name} className="font-bold">{p.name}: ₹{p.value.toLocaleString()}</p>)}
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
      if (entry) {
        setEntries(prev => [entry, ...prev])
        setAmount(''); setDescription(''); setShowAdd(false)
        toast.success(`${type === 'income' ? 'Income' : 'Expense'} logged!`)
      }
    } catch { toast.error('Failed') }
    finally { setSaving(false) }
  }

  const handleRemove = async (id: string) => {
    await deleteFinanceEntry(id)
    setEntries(prev => prev.filter(e => e.id !== id))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-7 h-7 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-7">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight">Finance</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">{format(now, 'MMMM yyyy')}</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3.5 py-2 rounded-xl text-[13px] font-medium hover:bg-primary/90 transition-colors">
          <Plus size={13} /> Add
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="bg-card rounded-2xl p-5 border border-border space-y-3 slide-up">
          <div className="flex gap-2">
            {(['expense', 'income'] as const).map(t => (
              <button key={t}
                onClick={() => { setType(t); setCategory(t === 'expense' ? 'Food & Dining' : 'Salary') }}
                className={`flex-1 py-2 rounded-xl text-[13px] font-medium transition-all ${
                  type === t
                    ? t === 'expense' ? 'bg-red-500/15 text-red-400 border border-red-500/25'
                      : 'bg-green-500/15 text-green-400 border border-green-500/25'
                    : 'bg-secondary border border-transparent text-muted-foreground'
                }`}>{t === 'expense' ? 'Expense' : 'Income'}</button>
            ))}
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
              <Input type="number" placeholder="0" value={amount} onChange={e => setAmount(e.target.value)}
                className="pl-7 bg-secondary border-border text-[13px]" autoFocus />
            </div>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-[150px] bg-secondary border-border text-[12px]" />
          </div>
          <Select value={category} onValueChange={(v) => v && setCategory(v)}>
            <SelectTrigger className="bg-secondary border-border text-[13px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input placeholder="Description (optional)" value={description}
            onChange={e => setDescription(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdd()}
            className="bg-secondary border-border text-[13px]" />
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowAdd(false)} className="flex-1 border-border text-[13px]">Cancel</Button>
            <Button onClick={handleAdd} disabled={saving || !amount} className="flex-1 bg-primary text-[13px]">Save</Button>
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-green-500/8 border border-green-500/15 rounded-2xl p-4">
          <div className="flex items-center gap-1.5 mb-1"><TrendingUp size={13} className="text-green-400" />
            <span className="text-[11px] text-muted-foreground">Income</span></div>
          <p className="text-xl font-bold text-green-400 tabular-nums">₹{totalIncome.toLocaleString()}</p>
        </div>
        <div className="bg-red-500/8 border border-red-500/15 rounded-2xl p-4">
          <div className="flex items-center gap-1.5 mb-1"><TrendingDown size={13} className="text-red-400" />
            <span className="text-[11px] text-muted-foreground">Spent</span></div>
          <p className="text-xl font-bold text-red-400 tabular-nums">₹{totalExpense.toLocaleString()}</p>
        </div>
        <div className={`rounded-2xl p-4 border ${net >= 0 ? 'bg-primary/8 border-primary/15' : 'bg-red-500/8 border-red-500/15'}`}>
          <div className="flex items-center gap-1.5 mb-1"><PiggyBank size={13} className={net >= 0 ? 'text-primary' : 'text-red-400'} />
            <span className="text-[11px] text-muted-foreground">Net</span></div>
          <p className={`text-xl font-bold tabular-nums ${net >= 0 ? 'text-primary' : 'text-red-400'}`}>
            {net >= 0 ? '+' : ''}₹{net.toLocaleString()}</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-[11px] text-muted-foreground mb-1">Savings Rate</p>
          <p className={`text-xl font-bold tabular-nums ${savingsRate >= 20 ? 'text-green-400' : savingsRate >= 0 ? 'text-yellow-400' : 'text-red-400'}`}>
            {savingsRate}%</p>
          <div className="mt-2 h-1 bg-secondary rounded-full overflow-hidden">
            <div className="h-full bg-green-400 rounded-full transition-all duration-700"
              style={{ width: `${Math.min(100, Math.max(0, savingsRate))}%` }} />
          </div>
        </div>
      </div>

      <Separator />

      <div className="grid grid-cols-2 gap-5">
        {/* Cashflow chart */}
        {dailyData.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Daily Cashflow</h2>
            <div className="bg-card rounded-2xl p-4 border border-border">
              <div className="flex gap-4 mb-3">
                {[{ c: '#34d399', l: 'Income' }, { c: '#f87171', l: 'Expense' }].map(d => (
                  <div key={d.l} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ background: d.c }} />
                    <span className="text-[10px] text-muted-foreground">{d.l}</span>
                  </div>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={dailyData} margin={{ top: 0, right: 4, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#64748b' }} tickLine={false} axisLine={false} />
                  <Tooltip content={<Tip />} />
                  <Bar dataKey="income" name="Income" fill="#34d399" radius={[3, 3, 0, 0]} maxBarSize={10} />
                  <Bar dataKey="expense" name="Expense" fill="#f87171" radius={[3, 3, 0, 0]} maxBarSize={10} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {/* Pie */}
        {pieData.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Spending Breakdown</h2>
            <div className="bg-card rounded-2xl p-4 border border-border">
              <div className="flex items-center gap-3">
                <PieChart width={110} height={110}>
                  <Pie data={pieData} cx={50} cy={50} innerRadius={28} outerRadius={48} dataKey="value" strokeWidth={0}>
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                </PieChart>
                <div className="space-y-1.5 flex-1 min-w-0">
                  {pieData.slice(0, 5).map((d, i) => (
                    <div key={d.name} className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-[11px] text-muted-foreground truncate">{d.name}</span>
                      <span className="text-[11px] font-bold ml-auto shrink-0">₹{d.value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}
      </div>

      <Separator />

      {/* Transaction list */}
      <section className="space-y-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Transactions</h2>
        {entries.length === 0 ? (
          <div className="bg-card rounded-2xl p-10 border border-border text-center text-muted-foreground text-[13px]">
            No transactions this month
          </div>
        ) : (
          <div className="space-y-1.5">
            {[...entries].sort((a, b) => b.date.localeCompare(a.date)).map(entry => (
              <div key={entry.id}
                className="flex items-center justify-between bg-card rounded-xl px-3.5 py-3 border border-border group">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                    entry.type === 'income' ? 'bg-green-500/12' : 'bg-red-500/12'}`}>
                    {entry.type === 'income'
                      ? <TrendingUp size={12} className="text-green-400" />
                      : <TrendingDown size={12} className="text-red-400" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium truncate">{entry.description ?? entry.category}</p>
                    <p className="text-[11px] text-muted-foreground">{entry.category} · {format(parseISO(entry.date), 'MMM d')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[13px] font-bold tabular-nums ${entry.type === 'income' ? 'text-green-400' : 'text-foreground'}`}>
                    {entry.type === 'income' ? '+' : '−'}₹{entry.amount.toLocaleString()}
                  </span>
                  <button onClick={() => handleRemove(entry.id!)}
                    className="p-1 rounded-lg text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all">
                    <X size={13} />
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
