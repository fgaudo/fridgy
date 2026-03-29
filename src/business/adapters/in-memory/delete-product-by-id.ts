import * as Effect from 'effect/Effect'
import { pipe } from 'effect/Function'
import * as Layer from 'effect/Layer'
import * as Opt from 'effect/Option'
import * as RequestResolver from 'effect/RequestResolver'

import * as DeleteProductById from '@/business/ports/delete-product-by-id.ts'
import * as Integer from '@/core/integer/integer.ts'

import * as InMemoryDb from './db.ts'

const makeDeleteResolver = Effect.gen(function* () {
	const db = yield* InMemoryDb.InMemoryDb

	return RequestResolver.fromEffect<DeleteProductById.Request>(
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
	)
})

export const layer = Layer.provide(
	Layer.effect(DeleteProductById.DeleteProductById, makeDeleteResolver),
	InMemoryDb.InMemoryDb.layer,
)
