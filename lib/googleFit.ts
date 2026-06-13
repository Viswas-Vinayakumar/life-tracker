// Google Fit REST API integration
// Setup: https://console.cloud.google.com → Enable Fitness API → OAuth2 Web App client
// Authorized origins: tauri://localhost  (+ http://localhost:3000 for dev)
// Put client_id in .env.local: NEXT_PUBLIC_GOOGLE_CLIENT_ID=xxx

const SCOPES = [
  'https://www.googleapis.com/auth/fitness.activity.read',
  'https://www.googleapis.com/auth/fitness.body.read',
  'https://www.googleapis.com/auth/fitness.heart_rate.read',
].join(' ')

const TOKEN_KEY = 'lifeos_gfit_token'
const TOKEN_EXP_KEY = 'lifeos_gfit_token_exp'

export function getGFitToken(): string | null {
  if (typeof window === 'undefined') return null
  const exp = Number(localStorage.getItem(TOKEN_EXP_KEY) ?? 0)
  if (Date.now() > exp) { localStorage.removeItem(TOKEN_KEY); return null }
  return localStorage.getItem(TOKEN_KEY)
}

export function storeGFitToken(token: string, expiresIn: number) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(TOKEN_EXP_KEY, String(Date.now() + expiresIn * 1000))
}

export function clearGFitToken() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(TOKEN_EXP_KEY)
}

export function isGFitConnected(): boolean {
  return Boolean(getGFitToken())
}

// Loads the Google Identity Services script and calls requestAccessToken
export async function connectGoogleFit(): Promise<boolean> {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
  if (!clientId) throw new Error('NEXT_PUBLIC_GOOGLE_CLIENT_ID not set in .env.local')

  return new Promise((resolve, reject) => {
    // Load GIS script if not already loaded
    if (!document.getElementById('gis-script')) {
      const script = document.createElement('script')
      script.id = 'gis-script'
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      document.head.appendChild(script)
      script.onload = () => initClient(clientId, resolve, reject)
      script.onerror = () => reject(new Error('Failed to load Google Identity Services'))
    } else {
      initClient(clientId, resolve, reject)
    }
  })
}

function initClient(clientId: string, resolve: (ok: boolean) => void, reject: (err: Error) => void) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const google = (window as any).google
    if (!google) { reject(new Error('Google Identity Services not loaded')); return }
    const client = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPES,
      callback: (response: { access_token?: string; expires_in?: number; error?: string }) => {
        if (response.error || !response.access_token) {
          reject(new Error(response.error ?? 'Auth failed'))
          return
        }
        storeGFitToken(response.access_token, response.expires_in ?? 3600)
        resolve(true)
      },
    })
    client.requestAccessToken()
  } catch (e) {
    reject(e instanceof Error ? e : new Error('OAuth init failed'))
  }
}

export interface FitDay {
  date: string  // YYYY-MM-DD
  steps: number
  calories_burned: number
  heart_rate_avg: number | null
  active_minutes: number
}

async function fitPost(token: string, body: object): Promise<Response> {
  return fetch('https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  })
}

// Fetch last N days of fitness data
export async function fetchFitData(days = 7): Promise<FitDay[]> {
  const token = getGFitToken()
  if (!token) return []

  const endMs = Date.now()
  const startMs = endMs - days * 24 * 60 * 60 * 1000

  const body = {
    aggregateBy: [
      { dataTypeName: 'com.google.step_count.delta' },
      { dataTypeName: 'com.google.calories.expended' },
      { dataTypeName: 'com.google.heart_rate.bpm' },
      { dataTypeName: 'com.google.active_minutes' },
    ],
    bucketByTime: { durationMillis: 86400000 },
    startTimeMillis: startMs,
    endTimeMillis: endMs,
  }

  try {
    const res = await fitPost(token, body)
    if (res.status === 401) { clearGFitToken(); return [] }
    if (!res.ok) return []
    const data = await res.json()

    return (data.bucket ?? []).map((bucket: {
      startTimeMillis: string
      dataset: { dataSourceId: string; point: { value: { intVal?: number; fpVal?: number }[] }[] }[]
    }) => {
      const date = new Date(Number(bucket.startTimeMillis)).toISOString().slice(0, 10)
      const get = (partial: string): number => {
        const ds = bucket.dataset.find((d: { dataSourceId: string }) => d.dataSourceId.includes(partial))
        const pts = ds?.point ?? []
        if (partial.includes('heart_rate')) {
          const vals = pts.flatMap((p: { value: { fpVal?: number }[] }) => p.value.map(v => v.fpVal ?? 0)).filter(Boolean)
          return vals.length ? Math.round(vals.reduce((a: number, b: number) => a + b, 0) / vals.length) : 0
        }
        return pts.reduce((s: number, p: { value: { intVal?: number; fpVal?: number }[] }) => s + (p.value[0]?.intVal ?? Math.round(p.value[0]?.fpVal ?? 0)), 0)
      }
      return {
        date,
        steps: get('step_count'),
        calories_burned: get('calories'),
        heart_rate_avg: get('heart_rate') || null,
        active_minutes: get('active_minutes'),
      }
    }).filter((d: FitDay) => d.steps > 0 || d.calories_burned > 0)
  } catch { return [] }
}

export async function fetchTodayFit(): Promise<FitDay | null> {
  const days = await fetchFitData(1)
  const today = new Date().toISOString().slice(0, 10)
  return days.find(d => d.date === today) ?? null
}
