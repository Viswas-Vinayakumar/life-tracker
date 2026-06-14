export default function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="logo-bg" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1a1a2e" />
          <stop offset="100%" stopColor="#0f0f1a" />
        </linearGradient>
        <linearGradient id="logo-accent" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="50%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#34d399" />
        </linearGradient>
      </defs>
      {/* Dark background */}
      <rect width="32" height="32" rx="9" fill="url(#logo-bg)" />
      {/* Subtle inner glow */}
      <rect width="32" height="32" rx="9" fill="url(#logo-accent)" opacity="0.07" />
      {/* Outer ring arc — top-right 3/4 circle */}
      <circle cx="16" cy="16" r="11" stroke="url(#logo-accent)" strokeWidth="1.5" strokeDasharray="52 17" strokeLinecap="round" fill="none" opacity="0.5" />
      {/* Bold "L" lettermark */}
      <path d="M11 8 L11 22 L21 22" stroke="url(#logo-accent)" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* Accent dot */}
      <circle cx="21" cy="22" r="2" fill="url(#logo-accent)" />
    </svg>
  )
}
