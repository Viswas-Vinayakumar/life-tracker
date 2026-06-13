export default function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="logo-grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#5B5BD6" />
          <stop offset="50%" stopColor="#0A84FF" />
          <stop offset="100%" stopColor="#32ADE6" />
        </linearGradient>
        <linearGradient id="logo-grad-2" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#7D7AFF" />
          <stop offset="100%" stopColor="#64D2FF" />
        </linearGradient>
      </defs>
      {/* Rounded square background */}
      <rect width="32" height="32" rx="8" fill="url(#logo-grad)" />
      {/* Life pulse path — simplified ECG/heartbeat */}
      <path
        d="M4 16 L9 16 L11 10 L13.5 22 L16 8 L18.5 22 L21 12 L23 16 L28 16"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.95"
      />
    </svg>
  )
}
