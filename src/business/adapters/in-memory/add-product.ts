import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as RequestResolver from 'effect/RequestResolver'

import * as AddProduct from '@/business/ports/add-product.ts'
import * as Integer from '@/core/integer/integer.ts'

import * as InMemoryDb from './db.ts'

const makeAddProductResolver = Effect.gen(function* () {
	const db = yield* InMemoryDb.InMemoryDb
	return RequestResolver.fromEffect<AddProduct.Request>(
		Effect.fn(function* ({ request }) {
			return (yield* db.addProduct({
				id: Integer.fromNumberUnsafe(3),
				...request.product,
			})).toString(10)
		}),
	)
})

export const layer = Layer.provide(
	Layer.effect(AddProduct.AddProduct, makeAddProductResolver),
	InMemoryDb.InMemoryDb.layer,
)
