import * as Arr from 'effect/Array'
import * as Effect from 'effect/Effect'
import { pipe } from 'effect/Function'
import * as Layer from 'effect/Layer'
import * as Opt from 'effect/Option'

import * as GetProducts from '../../../ports/outbound/get-products.ts'
import * as InMemoryDb from './db.ts'

const makeGetProducts = Effect.gen(function* () {
	const db = yield* InMemoryDb.InMemoryDb
	// @effect-diagnostics-next-line returnEffectInGen:off
	return Effect.gen(function* () {
		const map = yield* db.products
		const result = pipe(
			map,
			Arr.map(({ id, ...product }) => ({
				maybeName: Opt.some(product.name),
				maybeId: Opt.some(id.toString(10)),
				maybeCreationDate: Opt.some(product.creationDate),
				maybeExpirationDate: product.maybeExpirationDate,
			})),
		)
		return result
	})
})

export const layer = Layer.provide(
	Layer.effect(GetProducts.GetProducts, makeGetProducts),
	InMemoryDb.InMemoryDb.layer,
)
