import type * as Opt from 'effect/Option'
import * as _Schema from 'effect/Schema'

/** A number in [0, 1], bounds included. */
export const Schema = _Schema.Finite.check(_Schema.isBetween({ minimum: 0, maximum: 1 })).pipe(
  _Schema.brand('core.UnitInterval'),
)

export type UnitInterval = typeof Schema.Type

export const make: (n: number) => Opt.Option<UnitInterval> = _Schema.decodeOption(Schema)
export const makeUnsafe: (n: number) => UnitInterval = _Schema.decodeSync(Schema)
