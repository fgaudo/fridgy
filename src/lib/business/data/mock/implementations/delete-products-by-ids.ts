import { HashMap, Ref } from 'effect'

import { Eff, L } from '$lib/core/imports.ts'

import { DeleteProductsByIds } from '$lib/business/app/queries.ts'

import { Config } from '../config.ts'
import { Db } from '../db.ts'

export const command = L.effect(
	DeleteProductsByIds.DeleteProductsByIds,
	Eff.gen(function* () {
		const withErrors = yield* Config.withErrors
		const db = yield* Db
		return ids =>
			Eff.gen(function* () {
				if (withErrors && Math.random() < 0.5) {
					return yield* Eff.fail(
						new DeleteProductsByIds.OperationFailed(),
					)
				}

				for (const id of ids) {
					yield* Ref.update(db, dbValues => ({
						...dbValues,
						map: HashMap.remove(dbValues.map, id),
					}))
				}
			})
	}),
)
