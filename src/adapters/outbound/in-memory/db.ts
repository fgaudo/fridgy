import * as Context from 'effect/Context'
import * as Effect from 'effect/Effect'
import * as HashMap from 'effect/HashMap'
import * as Layer from 'effect/Layer'
import type * as Option from 'effect/Option'
import * as Ref from 'effect/Ref'

import * as Integer from '@/core/integer/integer.ts'

export type Product = Readonly<{
	id: Integer.Integer
	name: string
	maybeExpirationDate: Option.Option<Integer.Integer>
	creationDate: Integer.Integer
}>

export class InMemoryDb extends Context.Service<InMemoryDb>()(
	'ed34f7c1f1f46a75',
	{
		make: Effect.gen(function* () {
			const ref = yield* Ref.make({
				lastIndex: Integer.fromNumberUnsafe(0),
				map: HashMap.empty<Integer.Integer, Product>(),
			})
			return {
				products: Effect.gen(function* () {
					const { map } = yield* Ref.get(ref)
					const arr = HashMap.toValues(map)
					return arr
				}),
				deleteProductById: Effect.fn(function* (id: Integer.Integer) {
					return yield* Ref.update(ref, dbValues => ({
						...dbValues,
						map: HashMap.remove(dbValues.map, id),
					}))
				}),
				addProduct: Effect.fn(function* (product: Product) {
					const { lastIndex } = yield* Ref.updateAndGet(ref, dbValues => {
						const nextIndex = Integer.fromNumberUnsafe(dbValues.lastIndex + 1)
						return {
							...dbValues,
							lastIndex: nextIndex,
							map: dbValues.map.pipe(
								HashMap.set(nextIndex, {
									name: product.name,
									maybeExpirationDate: product.maybeExpirationDate,
									creationDate: product.creationDate,
									id: nextIndex,
								}),
							),
						}
					})
					return lastIndex
				}),
			}
		}),
	},
) {
	static layer = Layer.effect(this, this.make)
}
