import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import { pipe } from 'effect/Function'
import * as HashSet from 'effect/HashSet'
import * as Layer from 'effect/Layer'
import * as Option from 'effect/Option'
import * as ServiceMap from 'effect/ServiceMap'

import * as DeleteProductById from '@/business/ports/delete-product-by-id.ts'
import * as NonEmptyHashSet from '@/core/non-empty-hash-set.ts'

export type Params<Msg> = {
	ids: NonEmptyHashSet.NonEmptyHashSet<string>
	mapper: (r: Response) => Msg
}

export type Response = Data.TaggedEnum<{
	Failed: object
	Succeeded: object
}>
export const Response = Data.taggedEnum<Response>()

export class DeleteProductsByIds extends ServiceMap.Service<DeleteProductsByIds>()(
	'402cca6a248e6361',
	{
		make: Effect.gen(function* () {
			const resolver = yield* DeleteProductById.DeleteProductById

			return Effect.fn(function* ({
				ids,
			}: {
				ids: NonEmptyHashSet.NonEmptyHashSet<string>
			}) {
				yield* Effect.logInfo('Requested to delete products')
				yield* Effect.logInfo('Attempting to delete products...')

				const maybeDeleteResults = yield* pipe(
					ids,
					HashSet.map(id =>
						DeleteProductById.Request({
							id,
						}),
					),
					Effect.forEach(Effect.request(resolver), {
						concurrency: 'unbounded',
					}),
					Effect.option,
				)

				if (Option.isNone(maybeDeleteResults)) {
					return Response.Failed()
				}

				yield* Effect.logInfo('Products deleted')

				return Response.Succeeded()
			}, Effect.withLogSpan('DeleteAndGetProducts'))
		}),
	},
) {
	static layer = Layer.effect(this, this.make)
}
