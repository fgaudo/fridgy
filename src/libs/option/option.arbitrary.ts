import * as Opt from 'effect/Option'
import * as fc from 'fast-check'

export const arbitrary = <A>(item: fc.Arbitrary<A>): fc.Arbitrary<Opt.Option<A>> =>
  fc.option(item, { nil: undefined }).map((value) => (value === undefined ? Opt.none() : Opt.some(value)))
