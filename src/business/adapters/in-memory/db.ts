import * as Arr from 'effect/Array'
import * as Effect from 'effect/Effect'
import * as HashMap from 'effect/HashMap'
import * as Layer from 'effect/Layer'
import * as Option from 'effect/Option'
import * as Ref from 'effect/Ref'
import * as ServiceMap from 'effect/ServiceMap'

import * as Integer from '@/core/integer/integer'

export type Product = Readonly<{
	id: Integer.Integer
	name: string
	maybeExpirationDate: Option.Option<Integer.Integer>
	creationDate: Integer.Integer
}>

export class InMemoryDb extends ServiceMap.Service<InMemoryDb>()(
	'b62d3458716ef37f',
	{
		make: Effect.gen(function* () {
			const ref = yield* Ref.make({
				lastIndex: Integer.unsafeFromNumber(0),
				map: HashMap.empty<Integer.Integer, Product>(),
			})

			return {
				ref,
				products: Effect.gen(function* () {
					const { map } = yield* Ref.get(ref)

					const arr = HashMap.toValues(map)

					const immArr: readonly (typeof arr)[0][] = arr

					return immArr
				}),
				deleteProductById: Effect.fn(function* (id: Integer.Integer) {
					return yield* Ref.update(ref, dbValues => ({
						...dbValues,
						map: HashMap.remove(dbValues.map, id),
					}))
				}),
				addProduct: Effect.fn(function* (product: Product) {
					const { lastIndex } = yield* Ref.updateAndGet(ref, dbValues => {
						const nextIndex = Integer.unsafeFromNumber(dbValues.lastIndex + 1)
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
