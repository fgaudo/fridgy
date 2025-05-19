/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import { Eff, HM, L, R, RR, Ref, pipe } from '$lib/core/imports.ts'
import { withLayerLogging } from '$lib/core/logging.ts'

import { DeleteProductById } from '$lib/business/app/operations.ts'
import { MINIMUM_LAG_MS } from '$lib/ui/constants.ts'

import { Config } from '../config.ts'
import { Db } from '../db.ts'

export const command = L.effect(
	DeleteProductById.Resolver,
	Eff.gen(function* () {
		const withErrors = yield* Config.withErrors
		const db = yield* Db
		return RR.makeBatched(requests =>
			pipe(
				Eff.gen(function* () {
					if (withErrors && Math.random() < 0.5) {
						return yield* Eff.fail(new DeleteProductById.OperationFailed())
					}
					yield* Eff.sleep(MINIMUM_LAG_MS)
					for (const request of requests) {
						yield* Ref.update(db, dbValues => ({
							...dbValues,
							map: HM.remove(dbValues.map, request.id),
						}))
					}
				}),
				Eff.matchEffect({
					onFailure: error => Eff.forEach(requests, R.fail(error)),
					onSuccess: () => Eff.forEach(requests, R.succeed(undefined)),
				}),
				withLayerLogging(`I`),
			),
		)
	}),
)
