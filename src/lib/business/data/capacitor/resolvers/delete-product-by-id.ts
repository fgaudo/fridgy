import { E, Eff, L, O, R, RR, pipe } from '$lib/core/imports.ts'
import { withLayerLogging } from '$lib/core/logging.ts'

import { DeleteProductById } from '$lib/business/app/operations.ts'

import { DbPlugin } from '../db-plugin.ts'

export const command = L.effect(
	DeleteProductById.Resolver,
	Eff.gen(function* () {
		const { deleteProductsByIds } = yield* DbPlugin

		return RR.makeBatched(requests =>
			pipe(
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

									yield* Eff.logWarning(
										`Id has incorrect format. Skipping.`,
									).pipe(Eff.annotateLogs({ id }))

									return yield* Eff.fail(undefined)
								}),
							),
					)

					yield* Eff.logDebug(
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
				}),
				Eff.matchEffect({
					onFailure: error => Eff.forEach(requests, R.fail(error)),
					onSuccess: () => Eff.forEach(requests, R.succeed(undefined)),
				}),
				withLayerLogging(`I`),
			),
		)
	}),
)
