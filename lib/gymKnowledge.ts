// Comprehensive gym & physique knowledge base — embedded into Ollama prompts
// Sources: peer-reviewed sports science, NSCA guidelines, evidence-based fitness research

export const MUSCLE_GROUPS: Record<string, string[]> = {
  Chest:      ['Bench Press', 'Incline Bench Press', 'Decline Bench Press', 'Dumbbell Fly', 'Cable Fly', 'Push-up', 'Cable Crossover', 'Chest Dip', 'Pec Deck'],
  Back:       ['Pull-up', 'Chin-up', 'Lat Pulldown', 'Barbell Row', 'Dumbbell Row', 'Cable Row', 'T-Bar Row', 'Face Pull', 'Deadlift', 'Rack Pull', 'Hyperextension'],
  Shoulders:  ['Overhead Press', 'Dumbbell Shoulder Press', 'Arnold Press', 'Lateral Raise', 'Front Raise', 'Rear Delt Fly', 'Upright Row', 'Cable Lateral Raise'],
  Legs:       ['Squat', 'Front Squat', 'Hack Squat', 'Leg Press', 'Romanian Deadlift', 'Leg Curl', 'Leg Extension', 'Bulgarian Split Squat', 'Lunge', 'Calf Raise', 'Hip Thrust'],
  Arms:       ['Bicep Curl', 'Hammer Curl', 'Preacher Curl', 'Cable Curl', 'Tricep Pushdown', 'Skull Crusher', 'Overhead Tricep Extension', 'Close-Grip Bench', 'Dip'],
  Core:       ['Plank', 'Crunch', 'Leg Raise', 'Cable Crunch', 'Ab Wheel', 'Russian Twist', 'Hanging Knee Raise', 'Dragon Flag', 'Pallof Press'],
  Glutes:     ['Hip Thrust', 'Glute Bridge', 'Cable Kickback', 'Sumo Deadlift', 'Step-up'],
}

export function detectMuscleGroup(exerciseName: string): string {
  const name = exerciseName.toLowerCase()
  for (const [group, exercises] of Object.entries(MUSCLE_GROUPS)) {
    if (exercises.some(e => name.includes(e.toLowerCase().split(' ')[0]) || e.toLowerCase().includes(name.split(' ')[0]))) {
      return group
    }
  }
  return 'General'
}

export const ALL_EXERCISES = Object.values(MUSCLE_GROUPS).flat().sort()

export function getExerciseSuggestions(query: string): string[] {
  if (!query || query.length < 2) return []
  const q = query.toLowerCase()
  return ALL_EXERCISES.filter(e => e.toLowerCase().includes(q)).slice(0, 6)
}

export function getGymKnowledgeContext(): string {
  return `
EXPERT GYM COACHING KNOWLEDGE BASE (Evidence-Based):

=== GOAL: LEAN MUSCLE + <10% BODY FAT ===
- This is body recomposition — build muscle while reducing fat. Requires precision nutrition + smart training.
- Caloric deficit: 200-300 kcal/day below TDEE (small deficit preserves muscle)
- Protein: 2.0-2.2g/kg bodyweight — CRITICAL for muscle retention in deficit
- Carb timing: pre/post workout carbs for performance, lower carbs on rest days
- Fat minimum: 0.6g/kg for hormone health (testosterone for muscle building)

=== PROGRESSIVE OVERLOAD (PRIMARY DRIVER OF MUSCLE GROWTH) ===
- Add weight OR reps each week — if you can do 12+ reps, increase weight next session
- Double progression: hit top of rep range → increase weight by 2.5kg → rebuild reps
- Microloading: 1.25kg increments for upper body when stuck
- Volume progression: add 1 set per week per muscle group (within 10-20 sets/week MEV→MRV)

=== HYPERTROPHY-OPTIMAL REP RANGES ===
- Strength focus: 3-6 reps @ 85%+ 1RM (compounds — Bench, Squat, Deadlift)
- Hypertrophy sweet spot: 6-12 reps @ 67-80% 1RM (most volume should be here)
- Metabolic/pump: 12-20 reps @ 55-65% 1RM (isolation work, finishers)
- Best approach: Undulating periodisation — mix across all ranges

=== WEEKLY VOLUME GUIDELINES (Sets per muscle group) ===
- Minimum Effective Volume (MEV): 8-10 sets/week
- Hypertrophy Range: 10-20 sets/week
- Maximum Recoverable Volume (MRV): 20-25 sets/week (advanced)
- Priority muscles: train 2-3x/week for faster growth
- Big 3 frequency: Squat 2x, Bench 2x, Deadlift 1x per week minimum

=== REST PERIODS ===
- Heavy compounds (1-6 reps): 3-5 minutes
- Hypertrophy sets (6-12 reps): 90-120 seconds
- Isolation/pump work (12-20 reps): 60-90 seconds
- Shorter rest → more metabolic stress → good for fat loss but reduce volume
- For <10% BF goal: slightly shorter rest (90s) to burn more calories

=== TRAINING SPLIT (3-4 days for this user) ===
- Option A (Push/Pull/Legs x2): Best for 6 days, OK for 4
- Option B (Upper/Lower x2): Ideal for 4 days, great frequency
- Option C (Full Body x3): Best for 3 days, high frequency
- Muscle protein synthesis peaks 24-48h post-training → frequency matters

=== BODY FAT REDUCTION TO 10% ===
- Current ~12-14% → target 10% = need to lose ~2-4kg pure fat
- At 200kcal deficit: ~0.2kg fat/week → 10-20 weeks to reach target
- KEY: Maintain training intensity in deficit — this is what preserves muscle
- Sleep 7-8h: cortisol management is essential (high cortisol = muscle catabolism + fat storage)
- Water intake 3-4L/day: increases fat oxidation, reduces water retention
- Sugar <25g/day: insulin management critical for fat loss
- Cardio: LISS 2-3x/week (30-45min walking/cycling) preserves muscle better than HIIT

=== FORM CUES FOR MAIN LIFTS ===
Bench Press: Retract scapulae, slight arch, bar to lower chest, drive feet into floor
Squat: Brace core, knees tracking toes, depth to parallel or below, chest up
Deadlift: Neutral spine, bar close to body, drive through floor, hip hinge not squat
Overhead Press: Core tight, elbows slightly forward, lock out fully, no excessive lean
Row: Retract shoulder blade at top, control eccentric, don't use momentum

=== COMMON MISTAKES TO FLAG ===
- Ego lifting: too much weight, poor form, not reaching failure safely
- Insufficient volume: 2-3 sets per exercise is not enough for hypertrophy
- No progressive overload: same weights week after week = no growth
- Skipping legs: leg training releases anabolic hormones (GH, testosterone)
- No back training: imbalances, posture issues, injury risk
- Insufficient protein: most common reason for muscle loss in deficit

=== RECOVERY & ADAPTATION ===
- Muscles grow during recovery, not during training
- Sleep is the #1 recovery tool — 7-8h is non-negotiable
- Deload every 4-6 weeks: reduce volume by 40-50%, keep intensity
- DOMS (muscle soreness) peaks 24-48h — train through mild soreness
- Full recovery between same muscle groups: 48-72h minimum
`
}
