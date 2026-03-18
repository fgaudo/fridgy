import * as Arr from 'effect/Array'
import * as Effect from 'effect/Effect'
import { pipe } from 'effect/Function'
import * as Layer from 'effect/Layer'
import * as Opt from 'effect/Option'
import * as RequestResolver from 'effect/RequestResolver'

import * as Integer from '@/core/integer/integer.ts'

import * as InMemoryDb from '../../business/adapters/in-memory/db.ts'
import * as Repository from '../../business/ports/get-products.ts'

const makeDeleteResolver = Effect.gen(function* () {
	const db = yield* InMemoryDb.InMemoryDb

	return {
		getProduct: Effect.gen(function* () {
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
		}),
		deleteProductResolver: RequestResolver.fromEffect<Repository.DeleteRequest>(
			Effect.fn(function* (request) {
				const maybeId = pipe(
					Number.parseInt(request.request.id, 10),
					Integer.fromNumber,
				)

				if (Opt.isNone(maybeId)) {
					return yield* Effect.fail('Invalid id supplied')
				}

				return yield* db.deleteProductById(maybeId.value)
			}),
		),
	}
})

export const layer = Layer.provide(
	Layer.effect(Repository.GetProducts, makeDeleteResolver),
	InMemoryDb.InMemoryDb.layer,
)
