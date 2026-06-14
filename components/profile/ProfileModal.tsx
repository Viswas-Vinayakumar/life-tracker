'use client'

import { useState, useEffect, useRef } from 'react'
import { X, User, Save, ChevronDown } from 'lucide-react'
import { getProfile, saveProfile, calcBMI, calcTDEE, bmiLabel, GOAL_LABELS, ACTIVITY_LABELS, PHYSIQUE_LABELS, type UserProfile } from '@/lib/profile'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</label>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  height: 36, borderRadius: 8, border: '1px solid var(--border)', padding: '0 10px',
  fontSize: 13, background: 'var(--bg-2)', color: 'var(--text-1)', width: '100%',
}

const selectStyle: React.CSSProperties = { ...inputStyle, appearance: 'none', paddingRight: 28, cursor: 'default' }

export default function ProfileModal({ onClose }: { onClose: () => void }) {
  const [profile, setProfile] = useState<UserProfile>({ name: '' })
  const [saved, setSaved] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setProfile(getProfile())
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const patch = (k: keyof UserProfile, v: UserProfile[typeof k]) =>
    setProfile(prev => ({ ...prev, [k]: v }))

  const handleSave = () => {
    saveProfile(profile)
    setSaved(true)
    setTimeout(() => { setSaved(false); onClose() }, 800)
  }

  const bmi = profile.heightCm && profile.weightKg ? calcBMI(profile.heightCm, profile.weightKg) : null
  const tdee = calcTDEE(profile)

  const initials = profile.name
    ? profile.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  const DIETARY_OPTIONS: { key: NonNullable<UserProfile['dietaryPrefs']>[number]; label: string }[] = [
    { key: 'vegetarian',  label: 'Vegetarian' },
    { key: 'vegan',       label: 'Vegan' },
    { key: 'halal',       label: 'Halal' },
    { key: 'lactose_free', label: 'Lactose-free' },
    { key: 'gluten_free', label: 'Gluten-free' },
  ]

  return (
    <div
      ref={overlayRef}
      onClick={e => { if (e.target === overlayRef.current) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'color-mix(in srgb, var(--bg-1) 60%, transparent)',
        backdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'fade-up 0.18s ease both',
      }}
    >
      <div style={{
        width: 480, maxHeight: '85vh', overflow: 'auto',
        background: 'var(--surface)', borderRadius: 16,
        border: '1px solid var(--border-2)',
        boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
        animation: 'scale-in 0.2s ease both',
        scrollbarWidth: 'none',
      }}>
        {/* Header */}
        <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid var(--border-2)', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1 }}>
          {/* Avatar */}
          <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'linear-gradient(135deg, var(--violet), var(--cyan))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>{initials}</span>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 700 }}>{profile.name || 'Your Profile'}</p>
            <p className="footnote">{bmi ? `BMI ${bmi} · ${bmiLabel(bmi)}` : 'Add your details for personalised AI coaching'}</p>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, border: 'none', background: 'var(--bg-2)', cursor: 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)' }}>
            <X size={13} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Basic info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="First name">
              <input value={profile.name} onChange={e => patch('name', e.target.value)} placeholder="e.g. Viswas" style={inputStyle} />
            </Field>
            <Field label="Age">
              <input type="number" value={profile.age ?? ''} onChange={e => patch('age', e.target.value ? Number(e.target.value) : undefined)} placeholder="e.g. 24" style={inputStyle} min={10} max={100} />
            </Field>
            <Field label="Height (cm)">
              <input type="number" value={profile.heightCm ?? ''} onChange={e => patch('heightCm', e.target.value ? Number(e.target.value) : undefined)} placeholder="e.g. 178" style={inputStyle} min={100} max={250} />
            </Field>
            <Field label="Weight (kg)">
              <input type="number" value={profile.weightKg ?? ''} onChange={e => patch('weightKg', e.target.value ? Number(e.target.value) : undefined)} placeholder="e.g. 75" style={inputStyle} min={30} max={300} step={0.1} />
            </Field>
          </div>

          {/* BMI + TDEE display */}
          {(bmi || tdee) && (
            <div style={{ display: 'flex', gap: 8 }}>
              {bmi && (
                <div style={{ flex: 1, padding: '10px 12px', borderRadius: 10, background: 'var(--bg-2)' }}>
                  <p className="footnote" style={{ marginBottom: 2 }}>BMI</p>
                  <p style={{ fontSize: 18, fontWeight: 800, color: bmi < 18.5 ? 'var(--warning)' : bmi < 25 ? 'var(--success)' : bmi < 30 ? 'var(--warning)' : 'var(--error)' }}>{bmi}</p>
                  <p style={{ fontSize: 10, color: 'var(--text-3)' }}>{bmiLabel(bmi)}</p>
                </div>
              )}
              {tdee && (
                <div style={{ flex: 1, padding: '10px 12px', borderRadius: 10, background: 'var(--bg-2)' }}>
                  <p className="footnote" style={{ marginBottom: 2 }}>Daily Calories (TDEE)</p>
                  <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent)' }}>{tdee.toLocaleString()}</p>
                  <p style={{ fontSize: 10, color: 'var(--text-3)' }}>estimated maintenance</p>
                </div>
              )}
            </div>
          )}

          {/* Goal */}
          <Field label="Fitness Goal">
            <div style={{ position: 'relative' }}>
              <select value={profile.goal ?? ''} onChange={e => patch('goal', (e.target.value || undefined) as UserProfile['goal'])} style={selectStyle}>
                <option value="">Select goal…</option>
                {(Object.entries(GOAL_LABELS) as [NonNullable<UserProfile['goal']>, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
              <ChevronDown size={12} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }} />
            </div>
          </Field>

          {/* Activity level */}
          <Field label="Activity Level">
            <div style={{ position: 'relative' }}>
              <select value={profile.activityLevel ?? ''} onChange={e => patch('activityLevel', (e.target.value || undefined) as UserProfile['activityLevel'])} style={selectStyle}>
                <option value="">Select level…</option>
                {(Object.entries(ACTIVITY_LABELS) as [NonNullable<UserProfile['activityLevel']>, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
              <ChevronDown size={12} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }} />
            </div>
          </Field>

          {/* Dietary prefs */}
          <Field label="Dietary Preferences">
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {DIETARY_OPTIONS.map(({ key, label }) => {
                const active = profile.dietaryPrefs?.includes(key) ?? false
                return (
                  <button key={key} onClick={() => {
                    const curr = profile.dietaryPrefs ?? []
                    patch('dietaryPrefs', active ? curr.filter(k => k !== key) : [...curr, key])
                  }}
                    style={{
                      padding: '4px 10px', borderRadius: 20, border: 'none', cursor: 'default', fontSize: 11, fontWeight: 600,
                      background: active ? 'color-mix(in srgb, var(--accent) 15%, transparent)' : 'var(--bg-2)',
                      color: active ? 'var(--accent)' : 'var(--text-3)',
                      outline: active ? '1.5px solid var(--accent)' : 'none',
                      transition: 'all 0.15s',
                    }}>
                    {label}
                  </button>
                )
              })}
            </div>
          </Field>

          {/* Physique goal */}
          <Field label="Physique Goal">
            <div style={{ position: 'relative' }}>
              <select value={profile.physiqueGoal ?? ''} onChange={e => patch('physiqueGoal', (e.target.value || undefined) as UserProfile['physiqueGoal'])} style={selectStyle}>
                <option value="">Select physique goal…</option>
                {(Object.entries(PHYSIQUE_LABELS) as [NonNullable<UserProfile['physiqueGoal']>, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
              <ChevronDown size={12} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }} />
            </div>
          </Field>

          {/* Body fat + gym target */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <Field label="Current BF%">
              <input type="number" value={profile.bodyFatPct ?? ''} onChange={e => patch('bodyFatPct', e.target.value ? Number(e.target.value) : undefined)} placeholder="e.g. 13" style={inputStyle} min={3} max={50} step={0.5} />
            </Field>
            <Field label="Target BF%">
              <input type="number" value={profile.targetBodyFatPct ?? ''} onChange={e => patch('targetBodyFatPct', e.target.value ? Number(e.target.value) : undefined)} placeholder="e.g. 10" style={inputStyle} min={3} max={40} step={0.5} />
            </Field>
            <Field label="Gym / week">
              <input type="number" value={profile.gymTargetDays ?? ''} onChange={e => patch('gymTargetDays', e.target.value ? Number(e.target.value) : undefined)} placeholder="e.g. 4" style={inputStyle} min={1} max={7} />
            </Field>
          </div>

          {/* City */}
          <Field label="City (for local food context)">
            <input value={profile.city ?? ''} onChange={e => patch('city', e.target.value)} placeholder="e.g. Berlin, Munich, Hamburg" style={inputStyle} />
          </Field>

          <p style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.6 }}>
            🔒 Stored locally only. The AI uses your body fat target, gym schedule, and clean diet goal to give you personalised coaching — knows REWE, ALDI, LIDL and German foods.
          </p>
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px 18px', borderTop: '1px solid var(--border-2)', display: 'flex', gap: 8 }}>
          <button onClick={onClose}
            style={{ flex: 1, height: 36, borderRadius: 9, border: '1px solid var(--border)', background: 'none', cursor: 'default', fontSize: 13, color: 'var(--text-2)' }}>
            Cancel
          </button>
          <button onClick={handleSave}
            style={{ flex: 2, height: 36, borderRadius: 9, border: 'none', background: 'var(--accent)', cursor: 'default', fontSize: 13, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'opacity 0.15s' }}>
            {saved ? '✓ Saved!' : <><Save size={13} /> Save Profile</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// Compact trigger button shown at sidebar bottom
export function ProfileButton({ onClick }: { onClick: () => void }) {
  const [profile, setProfile] = useState<UserProfile>({ name: '' })
  useEffect(() => { setProfile(getProfile()) }, [])
  const initials = profile.name
    ? profile.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : null

  return (
    <button onClick={onClick} title="Your Profile"
      style={{ width: 30, height: 30, borderRadius: '50%', border: '1px solid var(--border-2)', background: initials ? 'linear-gradient(135deg, var(--violet), var(--cyan))' : 'var(--bg-2)', cursor: 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.15s' }}
      onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.08)')}
      onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}>
      {initials
        ? <span style={{ fontSize: 10, fontWeight: 800, color: '#fff' }}>{initials}</span>
        : <User size={13} color="var(--text-3)" />}
    </button>
  )
}
