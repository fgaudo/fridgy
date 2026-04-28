import * as Brand from 'effect/Brand'
import * as _Schema from 'effect/Schema'

export type Integer = Brand.Branded<number, 'core.Integer'>

const Integer = Brand.make<Integer>((n) => Number.isInteger(n))

export const IntegerFromSelf = _Schema.declare(
  (input): input is Integer => typeof input === 'number' && Integer.is(input),
)

export const fromNumber = (n: number) => Integer.option(n)
export const fromNumberUnsafe = Integer
export const isInteger = (n: number) => Integer.is(n)

export const Schema = _Schema.fromBrand('core.Integer', Integer)(_Schema.Number)

/** @internal */
export const _internal = {
  Integer,
}
