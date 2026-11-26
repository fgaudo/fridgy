import * as Opt from 'effect/Option'
import * as fc from 'fast-check'
import { utc } from '#libs/testing/date-time.test_arbitrary.ts'
import type { Entrance, Lasting, State } from './program.ts'

export const lasting: fc.Arbitrary<Lasting> = fc.constantFrom('Short', 'Long')

/**
 * A snackbar standing, of the notices `notice` makes: the last told, with the id it was given. The first one
 * told came alone.
 */
export const standing = <Notice>(notice: fc.Arbitrary<Notice>): fc.Arbitrary<State<Notice>> =>
  fc.record({
    id: fc.nat({ max: 20 }),
    notice,
    entrance: fc.constantFrom<Entrance>('Alone', 'AfterAnother'),
    maybeUntil: fc.option(utc, { nil: undefined }).map(Opt.fromNullishOr),
  }).map(({ id, entrance, ...rest }): State<Notice> => ({
    told: id + 1,
    maybeStanding: Opt.some({ id, entrance: id === 0 ? 'Alone' : entrance, ...rest }),
  }))

/** No snackbar standing, after any number told. */
export const none = <Notice>(): fc.Arbitrary<State<Notice>> =>
  fc.nat({ max: 20 }).map((told): State<Notice> => ({ told, maybeStanding: Opt.none() }))

/** Any state of the snackbar of the notices `notice` makes. */
export const state = <Notice>(notice: fc.Arbitrary<Notice>): fc.Arbitrary<State<Notice>> =>
  fc.oneof(none<Notice>(), standing(notice))
