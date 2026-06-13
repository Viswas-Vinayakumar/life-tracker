'use client'

import { useState } from 'react'
import { Plus, TrendingUp, TrendingDown, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { FinancialEntry } from '@/types'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/types'
import { toast } from 'sonner'

interface FinanceWidgetProps {
  date: string
  entries: FinancialEntry[]
  onAdd: (entry: FinancialEntry) => void
  onRemove: (id: string) => void
}

export default function FinanceWidget({ date, entries, onAdd, onRemove }: FinanceWidgetProps) {
  const [type, setType] = useState<'expense' | 'income'>('expense')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('Food & Dining')
  const [description, setDescription] = useState('')
  const [adding, setAdding] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const totalIncome = entries.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0)
  const totalExpense = entries.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0)
  const net = totalIncome - totalExpense

  const handleAdd = async () => {
    if (!amount || isNaN(parseFloat(amount))) return
    setAdding(true)
    try {
      const res = await fetch('/api/finance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, type, amount: parseFloat(amount), category, description: description || undefined }),
      })
      const entry = await res.json()
      onAdd(entry)
      setAmount('')
      setDescription('')
      setShowForm(false)
      toast.success(`${type === 'income' ? 'Income' : 'Expense'} added: ₹${parseFloat(amount).toLocaleString()}`)
    } catch {
      toast.error('Failed to save')
    } finally {
      setAdding(false)
    }
  }

  const handleRemove = async (id: string) => {
    await fetch(`/api/finance?id=${id}`, { method: 'DELETE' })
    onRemove(id)
  }

  const categories = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-2.5 text-center">
          <TrendingUp size={14} className="text-green-400 mx-auto mb-1" />
          <p className="text-xs text-muted-foreground">Income</p>
          <p className="text-sm font-bold text-green-400 tabular-nums">₹{totalIncome.toLocaleString()}</p>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-2.5 text-center">
          <TrendingDown size={14} className="text-red-400 mx-auto mb-1" />
          <p className="text-xs text-muted-foreground">Spent</p>
          <p className="text-sm font-bold text-red-400 tabular-nums">₹{totalExpense.toLocaleString()}</p>
        </div>
        <div className={`rounded-xl p-2.5 text-center border ${net >= 0
          ? 'bg-primary/10 border-primary/20'
          : 'bg-red-500/10 border-red-500/20'}`}>
          <p className="text-xs text-muted-foreground">Net</p>
          <p className={`text-sm font-bold tabular-nums ${net >= 0 ? 'text-primary' : 'text-red-400'}`}>
            {net >= 0 ? '+' : ''}₹{net.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Entries */}
      {entries.length > 0 && (
        <div className="space-y-1.5">
          {entries.map(entry => (
            <div key={entry.id}
              className="flex items-center justify-between bg-card rounded-xl px-3 py-2.5 border border-border group">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-md ${
                  entry.type === 'income' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                }`}>
                  {entry.type === 'income' ? '+' : '-'}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{entry.description ?? entry.category}</p>
                  <p className="text-xs text-muted-foreground">{entry.category}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-sm font-bold tabular-nums ${
                  entry.type === 'income' ? 'text-green-400' : 'text-foreground'
                }`}>
                  ₹{entry.amount.toLocaleString()}
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

      {/* Add form */}
      {showForm ? (
        <div className="space-y-2 slide-up">
          <div className="flex gap-2">
            <button
              onClick={() => { setType('expense'); setCategory('Food & Dining') }}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                type === 'expense' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-card border border-border text-muted-foreground'
              }`}>Expense</button>
            <button
              onClick={() => { setType('income'); setCategory('Salary') }}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                type === 'income' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-card border border-border text-muted-foreground'
              }`}>Income</button>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
              <Input
                type="number"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-7 bg-card border-border"
                autoFocus
              />
            </div>
            <Select value={category} onValueChange={(v) => v && setCategory(v)}>
              <SelectTrigger className="w-[140px] bg-card border-border text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Input
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            className="bg-card border-border"
          />
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowForm(false)} className="flex-1 border-border">Cancel</Button>
            <Button onClick={handleAdd} disabled={adding || !amount} className="flex-1 bg-primary hover:bg-primary/90">
              Add
            </Button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors text-sm">
          <Plus size={16} />
          Add transaction
        </button>
      )}
    </div>
  )
}
