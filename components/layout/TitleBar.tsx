'use client'

// Invisible drag region that sits behind the macOS traffic lights
// and allows dragging the window from the top right area.
export default function TitleBar({ title }: { title: string }) {
  return (
    <div
      data-tauri-drag-region
      className="fixed top-0 left-[200px] right-0 h-[52px] z-50 flex items-center justify-center pointer-events-none"
    >
      <span className="text-[13px] font-semibold text-foreground/60 select-none">{title}</span>
    </div>
  )
}
