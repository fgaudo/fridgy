import {
	E,
	Eff,
	H,
	HS,
	N,
	O,
} from '@/core/imports.ts'

import { DeleteProductsByIdsServiceError } from '@/app/interfaces/write/delete-products-by-ids.ts'

import { CapacitorService } from '../index.ts'

export const command: (
	ids: HS.HashSet<string>,
) => Eff.Effect<
	void,
	DeleteProductsByIdsServiceError,
	CapacitorService
> = ids =>
	Eff.gen(function* () {
		const { db } = yield* CapacitorService

		const idsArray = yield* Eff.all(
			Array.from(ids).map(id =>
				Eff.gen(function* () {
					const parsed = N.parse(id)

					if (
						O.isSome(parsed) &&
						Number.isInteger(parsed.value)
					) {
						return parsed.value
					}

					yield* H.logError(
						'Id has incorrect format',
					).pipe(
						Eff.annotateLogs({ id }),
						Eff.forkDaemon,
					)

					return yield* Eff.fail(
						DeleteProductsByIdsServiceError(
							'Id has incorrect format',
						),
					)
				}),
			),
		)

		yield* H.logDebug(
			`About to delete ${idsArray.length.toString(
				10,
			)} products`,
			Eff.forkDaemon,
		)

		const result = yield* H.tryPromise(() =>
			db.deleteProductsByIds({ ids: idsArray }),
		).pipe(Eff.either)

		if (E.isLeft(result)) {
			yield* H.logError(
				result.left,
				Eff.forkDaemon,
			)
			return yield* Eff.fail(
				DeleteProductsByIdsServiceError(
					'There was a problem while performing the request',
				),
			)
		}

		yield* H.logDebug(
			'No problems while deleting products',
			Eff.forkDaemon,
		)
	})
