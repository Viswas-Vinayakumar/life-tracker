'use client'

// Fires twice-daily reminders: 9 AM and 9 PM
// Uses Tauri notification API when in-app, Web Notifications in browser
import { useEffect } from 'react'

const MORNING_HOUR = 9   // 9:00 AM
const EVENING_HOUR = 21  // 9:00 PM
const WINDOW_MINUTES = 90 // fire within 90 min of target

type NotifKey = 'morning' | 'evening'

function todayKey(slot: NotifKey) {
  return `lifeos_notif_${slot}_${new Date().toISOString().slice(0, 10)}`
}

async function sendNotif(title: string, body: string) {
  try {
    // Tauri environment
    if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
      const { sendNotification, requestPermission, isPermissionGranted } = await import('@tauri-apps/plugin-notification')
      let granted = await isPermissionGranted()
      if (!granted) {
        const perm = await requestPermission()
        granted = perm === 'granted'
      }
      if (granted) sendNotification({ title, body })
      return
    }
    // Web Notifications fallback
    if ('Notification' in window) {
      if (Notification.permission === 'granted') new Notification(title, { body, icon: '/favicon.ico' })
      else if (Notification.permission !== 'denied') {
        const perm = await Notification.requestPermission()
        if (perm === 'granted') new Notification(title, { body, icon: '/favicon.ico' })
      }
    }
  } catch { /* silently fail — notifications are non-critical */ }
}

function shouldFire(targetHour: number): boolean {
  const now = new Date()
  const h = now.getHours()
  const m = now.getMinutes()
  const minutesSinceTarget = (h - targetHour) * 60 + m
  return minutesSinceTarget >= 0 && minutesSinceTarget < WINDOW_MINUTES
}

export default function NotificationScheduler() {
  useEffect(() => {
    const check = async () => {
      const morningKey = todayKey('morning')
      const eveningKey = todayKey('evening')

      if (shouldFire(MORNING_HOUR) && !localStorage.getItem(morningKey)) {
        localStorage.setItem(morningKey, '1')
        await sendNotif(
          'Good morning! 🌅',
          'Time to log your habits and start the day strong in Life OS.'
        )
      }

      if (shouldFire(EVENING_HOUR) && !localStorage.getItem(eveningKey)) {
        localStorage.setItem(eveningKey, '1')
        await sendNotif(
          'Evening check-in 🌙',
          'How did today go? Log your vitals, food, and wins in Life OS.'
        )
      }
    }

    // Check immediately on load
    check()

    // Re-check every 10 minutes while app is open
    const interval = setInterval(check, 10 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  return null
}
