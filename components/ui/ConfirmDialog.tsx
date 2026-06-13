'use client'

import { useEffect, useRef } from 'react'
import { AlertTriangle, Trash2 } from 'lucide-react'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', danger = true, onConfirm, onCancel }: ConfirmDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (open) confirmRef.current?.focus()
  }, [open])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!open) return
      if (e.key === 'Escape') onCancel()
      if (e.key === 'Enter') onConfirm()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onCancel, onConfirm])

  if (!open) return null

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0, zIndex: 999,
        background: 'rgba(0,0,0,0.45)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'fade-up 0.15s ease both',
      }}>
      <div
        onClick={e => e.stopPropagation()}
        className="card"
        style={{
          width: 320, padding: '22px 22px 18px',
          animation: 'scale-in 0.18s cubic-bezier(0.34,1.3,0.64,1) both',
          boxShadow: 'var(--shadow-lg)',
        }}>
        {/* Icon */}
        <div style={{
          width: 40, height: 40, borderRadius: 10, marginBottom: 14,
          background: danger ? 'color-mix(in srgb, var(--error) 12%, transparent)' : 'var(--bg-2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {danger
            ? <Trash2 size={18} color="var(--error)" />
            : <AlertTriangle size={18} color="var(--warning)" />}
        </div>

        <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{title}</p>
        <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5, marginBottom: 18 }}>{message}</p>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, height: 34, borderRadius: 'var(--r)', border: '1px solid var(--border)',
              background: 'none', cursor: 'default', fontSize: 13, fontWeight: 600, color: 'var(--text-2)',
            }}>
            Cancel
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            style={{
              flex: 1, height: 34, borderRadius: 'var(--r)', border: 'none', cursor: 'default',
              fontSize: 13, fontWeight: 700, color: '#fff',
              background: danger ? 'var(--error)' : 'var(--accent)',
            }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
