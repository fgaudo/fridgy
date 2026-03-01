import * as Arr from 'effect/Array'
import * as Effect from 'effect/Effect'
import { pipe } from 'effect/Function'
import * as Layer from 'effect/Layer'
import * as Option from 'effect/Option'

import * as GetProducts from '../../ports/get-products.ts'
import * as InMemoryDb from './db.ts'

const makeGetProducts = Effect.gen(function* () {
	const db = yield* InMemoryDb.InMemoryDb

	return {
		run: Effect.gen(function* () {
			const map = yield* db.products

			const result = pipe(
				map,
				Arr.map(({ id, ...product }) => ({
					maybeName: Option.some(product.name),
					maybeId: Option.some(id.toString(10)),
					maybeCreationDate: Option.some(product.creationDate),
					maybeExpirationDate: product.maybeExpirationDate,
				})),
			)

			return result
		}),
	}
})

export const layer = Layer.provide(
	Layer.effect(GetProducts.GetProducts, makeGetProducts),
	InMemoryDb.InMemoryDb.layer,
)
