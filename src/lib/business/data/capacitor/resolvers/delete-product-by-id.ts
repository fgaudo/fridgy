import { Request } from 'effect'

import { E, Eff, L, LL, O, RR, pipe } from '$lib/core/imports.ts'

import { DeleteProductById } from '$lib/business/app/operations.ts'

import { Deps } from '../../deps.ts'
import { DbPlugin } from '../db-plugin.ts'

export const command = L.effect(
	DeleteProductById.Resolver,
	Eff.gen(function* () {
		const { deleteProductsByIds } = yield* DbPlugin
		const { log } = yield* Deps

		return RR.makeBatched(requests =>
			Eff.gen(function* () {
				const ids = yield* Eff.allSuccesses(
					requests
						.map(r => r.id)
						.map(id =>
							Eff.gen(function* () {
								const parsed = yield* pipe(
									Eff.try(() => JSON.parse(id) as unknown),
									Eff.option,
									Eff.map(O.filter(id => typeof id === `number`)),
								)

								if (O.isSome(parsed)) {
									return parsed.value
								}

								yield* log(
									LL.Warning,
									`Id has incorrect format. Skipping.`,
								).pipe(Eff.annotateLogs({ id }))

								return yield* Eff.fail(undefined)
							}),
						),
				)

				yield* log(
					LL.Debug,
					`About to delete ${ids.length.toString(10)} products`,
				)

				const result = yield* Eff.either(
					deleteProductsByIds({
						ids,
					}),
				)

				if (E.isLeft(result)) {
					yield* Eff.logError(result.left.error)
					return yield* new DeleteProductById.OperationFailed()
				}

				return result.right
			}).pipe(
				Eff.andThen(() =>
					Eff.forEach(requests, request =>
						Request.completeEffect(request, Eff.succeed(undefined)),
					),
				),
				Eff.catchAll(error =>
					Eff.forEach(requests, request =>
						Request.completeEffect(request, Eff.fail(error)),
					),
				),
			),
		)
	}),
)

/**

const idsArray = yield* Eff.allSuccesses(
					Array.from(ids).map(id =>
						Eff.gen(function* () {
							const parsed = yield* pipe(
								Eff.try(() => JSON.parse(id) as unknown),
								Eff.option,
								Eff.map(O.filter(id => typeof id === `number`)),
							)

							if (O.isSome(parsed)) {
								return parsed.value
							}

							yield* log(LL.Warning, `Id has incorrect format. Skipping.`).pipe(
								Eff.annotateLogs({ id }),
							)

							return yield* Eff.fail(undefined)
						}),
					),
				)

				yield* log(
					LL.Debug,
					`About to delete ${idsArray.length.toString(10)} products`,
				)

				const result = yield* Eff.either(
					deleteProductsByIds({
						ids: idsArray,
					}),
				)

				if (E.isLeft(result)) {
					yield* Eff.logError(result.left.error)
					return yield* new DeleteProductById.OperationFailed()
				}

				yield* log(LL.Debug, `No problems while deleting products`)
			 */
