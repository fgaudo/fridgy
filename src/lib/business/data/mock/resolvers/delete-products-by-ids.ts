import {
	Eff,
	HM,
	L,
	RR,
	Ref,
} from '$lib/core/imports.ts'

import { DeleteProductsByIds } from '$lib/business/app/operations.ts'
import { MINIMUM_LAG_MS } from '$lib/ui/constants.ts'

import { Config } from '../config.ts'
import { Db } from '../db.ts'

export const command = L.effect(
	DeleteProductsByIds.Resolver,
	Eff.gen(function* () {
		const withErrors = yield* Config.withErrors
		const db = yield* Db
		return RR.fromEffect(({ ids }) =>
			Eff.gen(function* () {
				if (withErrors && Math.random() < 0.5) {
					return yield* Eff.fail(
						new DeleteProductsByIds.OperationFailed(),
					)
				}
				yield* Eff.sleep(MINIMUM_LAG_MS)
				for (const id of ids) {
					yield* Ref.update(db, dbValues => ({
						...dbValues,
						map: HM.remove(dbValues.map, id),
					}))
				}
			}),
		)
	}),
)
