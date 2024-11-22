import {
	E,
	Eff,
	H,
	L,
	N,
	O,
} from '@/core/imports.ts'

import { DeleteProductsByIdsService } from '@/app/interfaces/delete-products-by-ids.ts'

import { CapacitorService } from '../index.ts'

export const command = L.effect(
	DeleteProductsByIdsService,

	Eff.gen(function* () {
		const { db } = yield* CapacitorService

		return ids =>
			Eff.gen(function* () {
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
							).pipe(Eff.annotateLogs({ id }))

							return yield* Eff.fail(undefined)
						}),
					),
				)

				yield* H.logDebug(
					`About to delete ${idsArray.length.toString(
						10,
					)} products`,
				)

				const result = yield* H.tryPromise(() =>
					db.deleteProductsByIds({
						ids: idsArray,
					}),
				).pipe(Eff.either)

				if (E.isLeft(result)) {
					yield* H.logError(result.left)
					return yield* Eff.fail(undefined)
				}

				yield* H.logDebug(
					'No problems while deleting products',
				)
			})
	}),
)
