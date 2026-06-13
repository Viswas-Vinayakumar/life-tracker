'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Check } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'

interface HabitToggleProps {
  icon: string
  label: string
  done: boolean
  notes?: string
  color: string
  hasNotes?: boolean
  notesPlaceholder?: string
  onToggle: (done: boolean) => void
  onNotes?: (notes: string) => void
  points: number
}

export default function HabitToggle({
  icon, label, done, notes = '', color, hasNotes = false,
  notesPlaceholder, onToggle, onNotes, points
}: HabitToggleProps) {
  const [expanded, setExpanded] = useState(false)

  const handleToggle = () => {
    const next = !done
    onToggle(next)
    if (next && hasNotes) setExpanded(true)
    if (!next) setExpanded(false)
  }

  return (
    <div className={`rounded-2xl border transition-all duration-300 overflow-hidden
      ${done
        ? 'border-opacity-40 bg-gradient-to-br shadow-lg'
        : 'border-border bg-card'}`}
      style={done ? {
        borderColor: color + '60',
        background: `linear-gradient(135deg, ${color}18, ${color}08)`,
        boxShadow: `0 4px 20px ${color}20`
      } : {}}>

      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between p-4 transition-transform active:scale-[0.98]"
      >
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl transition-all duration-300
            ${done ? 'scale-110' : 'opacity-60'}`}
            style={{ background: done ? color + '30' : 'transparent' }}>
            {icon}
          </div>
          <div className="text-left">
            <p className={`font-semibold text-base transition-colors ${done ? 'text-foreground' : 'text-muted-foreground'}`}>
              {label}
            </p>
            <p className="text-xs text-muted-foreground">+{points} pts</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {done && hasNotes && (
            <button
              onClick={(e) => { e.stopPropagation(); setExpanded(!expanded) }}
              className="p-1 rounded-lg text-muted-foreground hover:text-foreground transition-colors">
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          )}
          <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300
            ${done ? 'border-transparent scale-110' : 'border-border'}`}
            style={done ? { background: color } : {}}>
            {done && <Check size={16} strokeWidth={3} className="text-white" />}
          </div>
        </div>
      </button>

      {done && hasNotes && expanded && (
        <div className="px-4 pb-4 slide-up">
          <Textarea
            placeholder={notesPlaceholder}
            value={notes}
            onChange={(e) => onNotes?.(e.target.value)}
            className="min-h-[70px] text-sm resize-none bg-black/20 border-white/10 placeholder:text-muted-foreground/50"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
