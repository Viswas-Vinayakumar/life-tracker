'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarCheck, CheckSquare, Wallet, BarChart3, UtensilsCrossed } from 'lucide-react'

const tabs = [
  { href: '/today',     icon: CalendarCheck,   label: 'Today'   },
  { href: '/food',      icon: UtensilsCrossed, label: 'Food'    },
  { href: '/tasks',     icon: CheckSquare,     label: 'Tasks'   },
  { href: '/finance',   icon: Wallet,          label: 'Finance' },
  { href: '/dashboard', icon: BarChart3,       label: 'Stats'   },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
      borderTop: '1px solid var(--border-2)',
      background: 'color-mix(in srgb, var(--surface) 90%, transparent)',
      backdropFilter: 'blur(20px) saturate(1.6)',
      paddingBottom: 'env(safe-area-inset-bottom, 10px)',
    }}>
      <div style={{ maxWidth: 540, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '8px 8px 4px' }}>
        {tabs.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href === '/today' && pathname === '/')
          return (
            <Link key={href} href={href}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                padding: '6px 12px', borderRadius: 10, textDecoration: 'none',
                color: active ? 'var(--accent)' : 'var(--text-3)',
                transition: 'color 0.15s ease',
              }}>
              <Icon size={22} strokeWidth={active ? 2.2 : 1.7} />
              <span style={{ fontSize: 9, fontWeight: active ? 700 : 500, letterSpacing: '0.02em' }}>{label}</span>
              {active && <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--accent)', marginTop: -2 }} />}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
