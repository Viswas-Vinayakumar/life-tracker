// IndexedDB offline cache — parallel to Supabase, works offline
import { openDB, type IDBPDatabase } from 'idb'

const DB_NAME = 'life-os-v1'
const DB_VERSION = 4  // bumped: added workout_logs store

type StoreKey = 'daily_logs' | 'food_entries' | 'financial_entries' | 'todos' | 'activity_log' | 'workout_logs'
type DB = IDBPDatabase<Record<StoreKey, { key: string; value: Record<string, unknown> }>>

let dbPromise: Promise<DB> | null = null

function getDB(): Promise<DB> {
  if (!dbPromise) {
    dbPromise = openDB<Record<StoreKey, { key: string; value: Record<string, unknown> }>>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('daily_logs'))        db.createObjectStore('daily_logs', { keyPath: 'date' })
        if (!db.objectStoreNames.contains('food_entries'))      db.createObjectStore('food_entries', { keyPath: 'id' })
        if (!db.objectStoreNames.contains('financial_entries')) db.createObjectStore('financial_entries', { keyPath: 'id' })
        if (!db.objectStoreNames.contains('todos'))             db.createObjectStore('todos', { keyPath: 'id' })
        if (!db.objectStoreNames.contains('activity_log'))      db.createObjectStore('activity_log', { keyPath: 'id' })
        if (!db.objectStoreNames.contains('workout_logs'))      db.createObjectStore('workout_logs', { keyPath: 'date' })
      },
    })
  }
  return dbPromise as Promise<DB>
}

export async function offlineGet<T>(store: StoreKey, key: string): Promise<T | undefined> {
  try { return (await (await getDB()).get(store, key)) as T | undefined } catch { return undefined }
}

export async function offlineGetAll<T>(store: StoreKey): Promise<T[]> {
  try { return (await (await getDB()).getAll(store)) as T[] } catch { return [] }
}

export async function offlinePut(store: StoreKey, value: Record<string, unknown>): Promise<void> {
  try { await (await getDB()).put(store, value) } catch { /* non-blocking */ }
}

export async function offlinePutAll(store: StoreKey, values: Record<string, unknown>[]): Promise<void> {
  try {
    const db = await getDB()
    const tx = db.transaction(store, 'readwrite')
    await Promise.all([...values.map(v => tx.store.put(v)), tx.done])
  } catch { /* non-blocking */ }
}

export async function offlineDelete(store: StoreKey, key: string): Promise<void> {
  try { await (await getDB()).delete(store, key) } catch { /* non-blocking */ }
}
