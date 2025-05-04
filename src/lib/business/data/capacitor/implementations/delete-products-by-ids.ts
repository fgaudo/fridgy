import { LogLevel } from 'effect'

import {
	Eff,
	H,
	L,
	O,
} from '$lib/core/imports.ts'

import { DeleteProductsByIds } from '$lib/business/app/queries.ts'

import { Deps } from '../../deps.ts'
import { DbPlugin } from '../db-plugin.ts'

export const command = L.effect(
	DeleteProductsByIds.DeleteProductsByIds,
	Eff.gen(function* () {
		const { db } = yield* DbPlugin
		const { log } = yield* Deps

		return ids =>
			Eff.gen(function* () {
				const idsArray = yield* Eff.allSuccesses(
					Array.from(ids).map(id =>
						Eff.gen(function* () {
							const parsed = yield* Eff.option(
								Eff.try(() => JSON.parse(id)),
							)

							if (O.isSome(parsed)) {
								return parsed.value
							}

							yield* log(
								LogLevel.Warning,
								'Id has incorrect format. Skipping.',
							).pipe(Eff.annotateLogs({ id }))

							return yield* Eff.fail(undefined)
						}),
					),
				)

				yield* log(
					LogLevel.Debug,
					`About to delete ${idsArray.length.toString(10)} products`,
				)

				yield* H.tryPromise(() =>
					db.deleteProductsByIds({
						ids: idsArray,
					}),
				).pipe(
					Eff.catchTags({
						UnknownException: () =>
							new DeleteProductsByIds.OperationFailed(),
					}),
				)

				yield* log(
					LogLevel.Debug,
					'No problems while deleting products',
				)
			})
	}),
)
