import { LogLevel } from 'effect'

import {
	A,
	Eff,
	NEHS,
} from '$lib/core/imports.ts'

import {
	DeleteProductsByIds as DeleteProductsByIdsQuery,
	LogWithLevel,
} from '$lib/business/app/queries'

export class DeleteProductsByIds extends Eff.Service<DeleteProductsByIds>()(
	'app/DeleteProductsByIds',
	{
		effect: Eff.gen(function* () {
			const deleteProductsByIds =
				yield* DeleteProductsByIdsQuery.DeleteProductsByIds

			const log = yield* LogWithLevel.LogWithLevel
			return (
				ids: NEHS.NonEmptyHashSet<string>,
			) =>
				Eff.gen(function* () {
					yield* log(
						LogLevel.Debug,
						'Delete products use-case started',
					)

					yield* deleteProductsByIds(ids)

					yield* log(
						LogLevel.Info,
						'Products deleted',
					).pipe(
						Eff.annotateLogs(
							'ids',
							A.fromIterable(ids),
						),
					)
				})
		}),
	},
) {}
