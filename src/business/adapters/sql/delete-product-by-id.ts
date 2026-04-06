import * as Arr from 'effect/Array'
import * as Effect from 'effect/Effect'
import { pipe } from 'effect/Function'
import * as Layer from 'effect/Layer'
import * as Option from 'effect/Option'
import * as Request from 'effect/Request'
import * as RequestResolver from 'effect/RequestResolver'

import * as DeleteProductById from '@/business/ports/delete-product-by-id.ts'
import * as Integer from '@/core/integer/integer.ts'

import * as SqlDb from './sql-db.ts'

const makeDeleteResolver = Effect.gen(function* () {
	const { productDataLoader } = yield* SqlDb.SqlDb
	return RequestResolver.make<DeleteProductById.Request>(
		Effect.fn(function* (entries) {
			const validEntries = pipe(
				entries,
				Arr.map(entry =>
					pipe(
						Number.parseInt(entry.request.id, 10),
						Integer.fromNumber,
						Option.map(id => [entry, id] as const),
					),
				),
				Arr.filter(maybeEntry => Option.isSome(maybeEntry)),
			)
			const maybeIds = yield* pipe(
				validEntries,
				Effect.forEach(maybeEntry =>
					productDataLoader.delete(maybeEntry.value[1]),
				),
				Effect.option,
			)
			if (Option.isNone(maybeIds)) {
				return yield* Effect.forEach(validEntries, entry =>
					Request.fail(entry.value[0], undefined),
				)
			}
			return yield* Effect.forEach(validEntries, entry =>
				Request.succeed(entry.value[0], undefined),
			)
		}),
	)
})
export const layer = Layer.provide(
	Layer.effect(DeleteProductById.DeleteProductById, makeDeleteResolver),
	SqlDb.SqlDb.layer,
)
