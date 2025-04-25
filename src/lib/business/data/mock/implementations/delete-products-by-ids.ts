import { Eff, L } from '$lib/core/imports.ts'

import { DeleteProductsByIds } from '$lib/business/app/queries.ts'

import { withErrors } from '../constants.ts'
import { map } from '../db.ts'

export const command = L.succeed(
	DeleteProductsByIds.Tag,
	ids =>
		Eff.gen(function* () {
			if (withErrors && Math.random() < 0.5) {
				return yield* Eff.fail(
					new DeleteProductsByIds.OperationFailed(
						{
							message: 'infrastructure',
						},
					),
				)
			}

			for (const id of ids) {
				map.delete(id)
			}
		}),
)
