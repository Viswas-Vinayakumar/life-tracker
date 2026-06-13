'use client'

import { useState, useRef } from 'react'
import { Plus, Loader2, X, Flame, Beef, Wheat, Droplets } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { FoodEntry } from '@/types'
import { toast } from 'sonner'

interface FoodLoggerProps {
  date: string
  entries: FoodEntry[]
  onAdd: (entry: FoodEntry) => void
  onRemove: (id: string) => void
}

const MEAL_EMOJIS: Record<string, string> = {
  breakfast: '🌅',
  lunch: '☀️',
  dinner: '🌙',
  snack: '🍎',
}

export default function FoodLogger({ date, entries, onAdd, onRemove }: FoodLoggerProps) {
  const [input, setInput] = useState('')
  const [mealType, setMealType] = useState<FoodEntry['meal_type']>('snack')
  const [parsing, setParsing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const totals = entries.reduce((acc, e) => ({
    calories: acc.calories + (e.calories ?? 0),
    protein: acc.protein + (e.protein ?? 0),
    carbs: acc.carbs + (e.carbs ?? 0),
    fat: acc.fat + (e.fat ?? 0),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 })

  const handleAdd = async () => {
    if (!input.trim()) return
    setParsing(true)
    try {
      const res = await fetch('/api/parse-food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: input.trim() }),
      })
      const nutrition = await res.json()
      if (nutrition.error) throw new Error(nutrition.error)

      const res2 = await fetch('/api/food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, raw_input: input.trim(), meal_type: mealType, ...nutrition }),
      })
      const entry = await res2.json()
      onAdd(entry)
      setInput('')
      inputRef.current?.focus()
      toast.success(`Added: ${nutrition.food_name} (${nutrition.calories} kcal)`)
    } catch {
      toast.error('Could not parse food — check your API key')
    } finally {
      setParsing(false)
    }
  }

  const handleRemove = async (id: string) => {
    await fetch(`/api/food?id=${id}`, { method: 'DELETE' })
    onRemove(id)
  }

  const grouped = entries.reduce<Record<string, FoodEntry[]>>((acc, e) => {
    acc[e.meal_type] = [...(acc[e.meal_type] ?? []), e]
    return acc
  }, {})

  return (
    <div className="space-y-3">
      {/* Totals bar */}
      {entries.length > 0 && (
        <div className="grid grid-cols-4 gap-2 pop-in">
          {[
            { icon: <Flame size={12} />, label: 'kcal', value: Math.round(totals.calories), color: '#f97316' },
            { icon: <Beef size={12} />, label: 'protein', value: `${Math.round(totals.protein)}g`, color: '#ef4444' },
            { icon: <Wheat size={12} />, label: 'carbs', value: `${Math.round(totals.carbs)}g`, color: '#eab308' },
            { icon: <Droplets size={12} />, label: 'fat', value: `${Math.round(totals.fat)}g`, color: '#06b6d4' },
          ].map(({ icon, label, value, color }) => (
            <div key={label} className="bg-card rounded-xl p-2 text-center border border-border">
              <div className="flex items-center justify-center gap-1 mb-0.5" style={{ color }}>
                {icon}
                <span className="text-[10px] font-medium uppercase tracking-wider">{label}</span>
              </div>
              <p className="text-sm font-bold tabular-nums">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Grouped food entries */}
      {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map(meal => {
        const items = grouped[meal]
        if (!items?.length) return null
        return (
          <div key={meal} className="space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
              {MEAL_EMOJIS[meal]} {meal}
            </p>
            {items.map(entry => (
              <div key={entry.id}
                className="flex items-center justify-between bg-card rounded-xl px-3 py-2.5 border border-border group">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{entry.food_name ?? entry.raw_input}</p>
                  <p className="text-xs text-muted-foreground">
                    {entry.calories} kcal · {entry.protein}g P · {entry.carbs}g C · {entry.fat}g F
                  </p>
                </div>
                <button
                  onClick={() => handleRemove(entry.id!)}
                  className="ml-2 p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )
      })}

      {/* Input row */}
      <div className="flex gap-2 items-center">
        <Select value={mealType} onValueChange={(v) => setMealType(v as FoodEntry['meal_type'])}>
          <SelectTrigger className="w-[100px] shrink-0 bg-card border-border text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="breakfast">🌅 Breakfast</SelectItem>
            <SelectItem value="lunch">☀️ Lunch</SelectItem>
            <SelectItem value="dinner">🌙 Dinner</SelectItem>
            <SelectItem value="snack">🍎 Snack</SelectItem>
          </SelectContent>
        </Select>
        <Input
          ref={inputRef}
          placeholder="What did you eat? (e.g. 2 eggs, rice, chicken)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          className="flex-1 bg-card border-border"
          disabled={parsing}
        />
        <Button
          onClick={handleAdd}
          disabled={parsing || !input.trim()}
          size="icon"
          className="shrink-0 bg-primary hover:bg-primary/90">
          {parsing ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
        </Button>
      </div>
    </div>
  )
}
