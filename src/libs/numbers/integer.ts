import type * as Opt from 'effect/Option'
import * as _Schema from 'effect/Schema'

/**
 * An integer that a `number` holds exactly: within ±`Number.MAX_SAFE_INTEGER`, as `Schema.Int` checks (its
 * documentation does not say so; `integer.test.ts` holds it to it).
 */
export const Schema = _Schema.Int.pipe(_Schema.brand('core.Integer'))

export type Integer = typeof Schema.Type

export const make: (n: number) => Opt.Option<Integer> = _Schema.decodeOption(Schema)
export const makeUnsafe: (n: number) => Integer = _Schema.decodeSync(Schema)
