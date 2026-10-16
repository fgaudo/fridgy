import type * as Opt from 'effect/Option'
import * as _Schema from 'effect/Schema'
import * as Integer from './integer.ts'

/** An `Integer` greater than zero. */
export const Schema = Integer.Schema.check(_Schema.isGreaterThan(0)).pipe(_Schema.brand('core.PositiveInteger'))

export type PositiveInteger = typeof Schema.Type

export const make: (n: number) => Opt.Option<PositiveInteger> = _Schema.decodeOption(Schema)
export const makeUnsafe: (n: number) => PositiveInteger = _Schema.decodeSync(Schema)
