import * as Brand from 'effect/Brand'
import * as _Schema from 'effect/Schema'

export type Integer = Brand.Branded<number, 'core.Integer'>

const Integer = Brand.make<Integer>((n) => Number.isInteger(n))

export const fromNumber = (n: number) => Integer.option(n)
export const fromNumberUnsafe = Integer

export const Schema = _Schema.fromBrand('core.Integer', Integer)(_Schema.Number)

/** @internal Shared with `positive-integer.ts`, which refines it. */
export const _internal = {
  Integer,
}
