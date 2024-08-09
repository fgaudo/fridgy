export * as Eff from 'effect/Effect'
export { pipe, flow } from 'effect'
export * as O from 'effect/Option'
export * as E from 'effect/Either'
export * as A from 'effect/Array'
export * as Eq from 'effect/Equal'
export * as Ord from 'effect/Order'
export * as L from 'effect/Layer'
export * as C from 'effect/Context'
export * as Sc from '@effect/schema/Schema'

export const BrandTypeId: unique symbol =
	Symbol.for('effect/Brand')

export interface Brand<
	in out ID extends string | symbol,
> {
	readonly [BrandTypeId]: {
		readonly [id in ID]: ID
	}
}
