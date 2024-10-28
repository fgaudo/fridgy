import { tryPromise } from 'effect/Effect'

import {
	E,
	Eff,
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

					yield* Eff.logError(
						'Id has incorrect format',
					).pipe(Eff.annotateLogs({ id }))

					return yield* Eff.fail(
						DeleteProductsByIdsServiceError(
							'Id has incorrect format',
						),
					)
				}),
			),
		)

		yield* Eff.log(
			`About to delete ${idsArray.length.toString(
				10,
			)} products`,
		)

		const result = yield* tryPromise(() =>
			db.deleteProductsByIds({ ids: idsArray }),
		).pipe(Eff.either)

		if (E.isLeft(result)) {
			yield* Eff.logError(result.left)
			return yield* Eff.fail(
				DeleteProductsByIdsServiceError(
					'There was a problem while performing the request',
				),
			)
		}

		yield* Eff.log(
			'No problems while deleting products',
		)
	})
