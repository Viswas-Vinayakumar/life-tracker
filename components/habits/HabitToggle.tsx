'use client'

import { useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'

interface HabitToggleProps {
  icon: string
  label: string
  sublabel?: string
  done: boolean
  notes?: string
  color: string
  colorBg: string
  hasNotes?: boolean
  notesPlaceholder?: string
  onToggle: (done: boolean) => void
  onNotes?: (notes: string) => void
  points: number
}

export default function HabitToggle({
  icon, label, sublabel, done, notes = '', color, colorBg,
  hasNotes, notesPlaceholder, onToggle, onNotes, points
}: HabitToggleProps) {
  const [expanded, setExpanded] = useState(false)

  const handleToggle = () => {
    const next = !done
    onToggle(next)
    if (next && hasNotes) setExpanded(true)
    if (!next) setExpanded(false)
  }

  return (
    <div
      className="habit-card"
      style={{
        '--habit-color': color,
        background: done ? colorBg : 'var(--surface)',
        borderColor: done ? color : 'var(--border)',
        overflow: 'hidden',
      } as React.CSSProperties}
    >
      <div
        onClick={handleToggle}
        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px', cursor: 'default' }}
      >
        {/* Icon */}
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: done ? color : 'var(--bg-2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, flexShrink: 0,
          transition: 'all 0.2s ease',
          transform: done ? 'scale(1.05)' : 'scale(1)',
        }}>
          {icon}
        </div>

        {/* Label */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 15, fontWeight: 600, color: done ? color : 'var(--text-1)', transition: 'color 0.2s ease' }}>
            {label}
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 1 }}>
            {done && notes ? notes : (sublabel ?? `+${points} pts`)}
          </p>
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {done && hasNotes && (
            <button
              onClick={e => { e.stopPropagation(); setExpanded(!expanded) }}
              style={{ padding: 4, color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'default',
                       display: 'flex', alignItems: 'center', borderRadius: 4 }}>
              <ChevronDown size={13} strokeWidth={2} style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
            </button>
          )}
          {/* Toggle */}
          <div
            style={{
              width: 24, height: 24, borderRadius: '50%',
              background: done ? color : 'transparent',
              border: done ? 'none' : `1.5px solid var(--border)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.22s cubic-bezier(0.34,1.3,0.64,1)',
              transform: done ? 'scale(1.1)' : 'scale(1)',
            }}>
            {done && (
              <Check size={12} strokeWidth={3} color="white" style={{ animation: 'check-pop 0.22s cubic-bezier(0.34,1.56,0.64,1) both' }} />
            )}
          </div>
        </div>
      </div>

      {/* Notes drawer */}
      {done && hasNotes && expanded && (
        <div style={{ padding: '0 14px 13px', animation: 'fade-up 0.2s ease both' }}>
          <textarea
            placeholder={notesPlaceholder}
            value={notes}
            onChange={e => onNotes?.(e.target.value)}
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', minHeight: 64, resize: 'none',
              background: 'var(--bg-2)', border: '1px solid var(--border)',
              borderRadius: 'var(--r)', padding: '8px 10px',
              fontSize: 13, color: 'var(--text-1)', lineHeight: 1.5,
            }}
          />
        </div>
      )}
    </div>
  )
}
