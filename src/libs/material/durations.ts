// Material 3's durations, for the views' motions and the programs' timers that wait for them.

/** Material's motion durations, in ms (`docs/motion.md`). */
export const duration = {
  short1: 50,
  short2: 100,
  short3: 150,
  short4: 200,
  medium1: 250,
  medium2: 300,
  medium4: 400,
  long2: 500,
} as const

/** How long Material's snackbar stands, in ms: `long` for one with an action. */
export const snackbarDuration = { short: 4000, long: 10000 } as const
