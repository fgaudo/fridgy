import * as Opt from 'effect/Option'
import * as fc from 'fast-check'
import * as NormalizedString from './normalized-string.ts'

/** Generates `NormalizedString`s by normalizing arbitrary strings (inputs that cannot be normalized are skipped). */
export const arbitrary: fc.Arbitrary<NormalizedString.NormalizedString> = fc
  .string({ minLength: 1 })
  .map(NormalizedString.fromString)
  .filter(Opt.isSome)
  .map((normalized) => normalized.value)
