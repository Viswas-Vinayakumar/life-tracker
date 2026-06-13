'use client'

import { getScoreColor, getScoreLabel } from '@/lib/scoring'

export default function ScoreRing({ score, size = 100 }: { score: number; size?: number }) {
  const r = 40
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const color = getScoreColor(score)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
          {/* Track */}
          <circle cx="50" cy="50" r={r} fill="none" stroke="var(--bg-3)" strokeWidth="7" />
          {/* Progress */}
          <circle
            cx="50" cy="50" r={r} fill="none"
            stroke={color} strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.34,1.2,0.64,1), stroke 0.3s ease' }}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <span className="tabular-nums" style={{ fontSize: size * 0.28, fontWeight: 700, color, lineHeight: 1, letterSpacing: '-0.5px' }}>
            {score}
          </span>
          <span style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 500, marginTop: 1 }}>/ 100</span>
        </div>
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, color, letterSpacing: 0.2 }}>{getScoreLabel(score)}</span>
    </div>
  )
}
