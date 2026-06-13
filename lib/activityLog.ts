// Activity log — records every user action for audit trail + AI context
import { offlinePut, offlineGetAll } from './offline'

export type ActivityType = 'habit' | 'food' | 'todo' | 'finance' | 'vitals' | 'journal' | 'history_edit'
export type ActivityAction = 'toggled_on' | 'toggled_off' | 'added' | 'completed' | 'deleted' | 'updated' | 'edited'

export interface ActivityEntry {
  id: string
  timestamp: string
  date: string           // which day this action is about (YYYY-MM-DD)
  type: ActivityType
  action: ActivityAction
  description: string
  metadata?: Record<string, unknown>
}

export async function logActivity(
  type: ActivityType,
  action: ActivityAction,
  description: string,
  date?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const entry: ActivityEntry = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    date: date ?? new Date().toISOString().slice(0, 10),
    type,
    action,
    description,
    metadata,
  }
  await offlinePut('activity_log', entry as unknown as Record<string, unknown>)
}

export async function getActivityLog(limitDays = 7): Promise<ActivityEntry[]> {
  const all = await offlineGetAll<ActivityEntry>('activity_log')
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - limitDays)
  return all
    .filter(e => new Date(e.timestamp) >= cutoff)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
}

export async function getAllActivityLog(): Promise<ActivityEntry[]> {
  const all = await offlineGetAll<ActivityEntry>('activity_log')
  return all.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
}
