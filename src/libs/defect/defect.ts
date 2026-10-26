/**
 * A branch the invariants say cannot be reached: ends the run as a thrown error does, where `throw` is not an
 * expression (a branch of a `Match`, a ternary).
 */
export const defect = (reason: string): never => {
  throw new Error(reason)
}
