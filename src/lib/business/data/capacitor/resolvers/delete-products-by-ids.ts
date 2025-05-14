import { E, Eff, L, LL, O, RR } from '$lib/core/imports.ts'

import { DeleteProductsByIds } from '$lib/business/app/operations.ts'

import { Deps } from '../../deps.ts'
import { DbPlugin } from '../db-plugin.ts'

export const command = L.effect(
	DeleteProductsByIds.Resolver,
	Eff.gen(function* () {
		const { deleteProductsByIds } = yield* DbPlugin
		const { log } = yield* Deps

		return RR.fromEffect(({ ids }) =>
			Eff.gen(function* () {
				const idsArray = yield* Eff.allSuccesses(
					Array.from(ids).map(id =>
						Eff.gen(function* () {
							const parsed = yield* Eff.option(Eff.try(() => JSON.parse(id)))

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
					return yield* new DeleteProductsByIds.OperationFailed()
				}

				yield* log(LL.Debug, `No problems while deleting products`)
			}),
		)
	}),
)
