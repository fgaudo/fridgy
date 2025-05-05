import { LogLevel } from 'effect'

import {
	A,
	Eff,
	NEHS,
} from '$lib/core/imports.ts'

import {
	DeleteProductsByIds as DeleteProductsByIdsOperation,
	LogWithLevel,
} from '$lib/business/app/operations'

export class DeleteProductsByIds extends Eff.Service<DeleteProductsByIds>()(
	'app/useCases/DeleteProductsByIds',
	{
		effect: Eff.gen(function* () {
			const deleteProductsResolver =
				yield* DeleteProductsByIdsOperation.Resolver

			const logResolver =
				yield* LogWithLevel.Resolver

			return (
				ids: NEHS.NonEmptyHashSet<string>,
			) =>
				Eff.gen(function* () {
					yield* Eff.request(
						LogWithLevel.Request({
							level: LogLevel.Debug,
							message: [
								'Delete products use-case started',
							],
						}),
						logResolver,
					)

					yield* Eff.request(
						DeleteProductsByIdsOperation.Request({
							ids,
						}),
						deleteProductsResolver,
					)

					yield* Eff.request(
						LogWithLevel.Request({
							level: LogLevel.Info,
							message: ['Products deleted'],
							annotations: {
								ids: A.fromIterable(ids),
							},
						}),
						logResolver,
					)
				})
		}),
	},
) {}
