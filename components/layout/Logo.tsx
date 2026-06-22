export default function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="logo-card" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#ececed" />
        </linearGradient>
        <linearGradient id="logo-arrow" x1="8" y1="7" x2="26" y2="25" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#454b59" />
          <stop offset="100%" stopColor="#14171e" />
        </linearGradient>
      </defs>
      {/* Light squircle card — matches the app icon */}
      <rect width="32" height="32" rx="8.5" fill="url(#logo-card)" />
      {/* Small chevron */}
      <path d="M8.6 12 L13 16 L8.6 20" stroke="url(#logo-arrow)" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* Medium chevron */}
      <path d="M13.4 10.4 L19 16 L13.4 21.6" stroke="url(#logo-arrow)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* Solid arrowhead */}
      <path d="M18 9 L26.4 16 L18 23 L21.6 16 Z" fill="url(#logo-arrow)" />
    </svg>
  )
}
