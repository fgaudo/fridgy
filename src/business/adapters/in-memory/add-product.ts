import * as Effect from 'effect/Effect'
import { pipe } from 'effect/Function'
import * as Layer from 'effect/Layer'
import * as Opt from 'effect/Option'
import * as RequestResolver from 'effect/RequestResolver'

import * as Integer from '@/core/integer/integer.ts'

import * as AddProduct from '../../ports/add-product.ts'
import * as InMemoryDb from './db.ts'

const makeAddProductResolver = Effect.gen(function* () {
	const db = yield* InMemoryDb.InMemoryDb

	return {
		resolver: RequestResolver.fromEffect<AddProduct.Request>(
			Effect.fn(function* ({ request }) {
				const maybeId = pipe(
					Number.parseInt(request.id, 10),
					Integer.fromNumber,
				)
				if (Opt.isNone(maybeId)) {
					return yield* Effect.fail(undefined)
				}

				return (yield* db.addProduct({
					id: maybeId.value,
					...request.product,
				})).toString(10)
			}),
		),
	}
})

export const layer = Layer.provide(
	Layer.effect(AddProduct.AddProduct, makeAddProductResolver),
	InMemoryDb.InMemoryDb.layer,
)
