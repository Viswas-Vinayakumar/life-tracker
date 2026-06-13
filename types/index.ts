export interface DailyLog {
  id?: string
  date: string
  gym_done: boolean
  gym_notes?: string
  study_done: boolean
  study_notes?: string
  skincare_am: boolean
  skincare_pm: boolean
  water_glasses: number
  sleep_hours?: number
  mood?: number
  energy?: number
  weight_kg?: number
  steps?: number
  heart_rate_avg?: number
  journal?: string
  performance_score?: number
  created_at?: string
  updated_at?: string
}

export interface FoodEntry {
  id?: string
  date: string
  raw_input: string
  food_name?: string
  calories?: number
  protein?: number
  carbs?: number
  fat?: number
  fiber?: number
  sugar?: number
  sodium_mg?: number
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  created_at?: string
}

export interface FinancialEntry {
  id?: string
  date: string
  type: 'income' | 'expense'
  amount: number
  category: string
  description?: string
  created_at?: string
}

export interface Todo {
  id?: string
  title: string
  notes?: string
  priority: 'low' | 'normal' | 'high'
  list: 'today' | 'backlog'
  status: 'pending' | 'completed'
  due_date?: string
  completed_at?: string
  created_at?: string
  updated_at?: string
}

export const EXPENSE_CATEGORIES = [
  'Food & Dining', 'Transport', 'Shopping', 'Housing & Bills',
  'Health & Fitness', 'Entertainment', 'Subscriptions', 'Education',
  'Travel', 'Gifts', 'Personal Care', 'Other',
] as const

export const INCOME_CATEGORIES = ['Salary', 'Freelance', 'Investment', 'Gift', 'Other'] as const

export const NUTRITION_GOALS = { calories: 2200, protein: 150, carbs: 250, fat: 70, fiber: 30, water_glasses: 8, sleep_hours: 8 }
