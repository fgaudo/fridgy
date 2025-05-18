/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import { Request } from 'effect'

import { Eff, HM, L, RR, Ref } from '$lib/core/imports.ts'

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
			}).pipe(
				Eff.andThen(() =>
					Eff.forEach(requests, request =>
						Request.completeEffect(request, Eff.succeed(undefined)),
					),
				),
				Eff.catchAll(error =>
					Eff.forEach(requests, request =>
						Request.completeEffect(request, Eff.fail(error)),
					),
				),
			),
		)
	}),
)
