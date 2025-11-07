import * as Effect from 'effect/Effect'
import * as HashMap from 'effect/HashMap'
import * as Layer from 'effect/Layer'
import * as Ref from 'effect/Ref'
import * as Request from 'effect/Request'
import * as RequestResolver from 'effect/RequestResolver'

import { MINIMUM_LAG_MS } from '$lib/constants.ts'

import { DeleteProductById } from '../../../app/operations.ts'
import { Config } from '../config.ts'
import { Db } from '../db.ts'

export const command = Layer.effect(
	DeleteProductById.Resolver,
	Effect.gen(function* () {
		const withErrors = yield* Config.withErrors
		const db = yield* Db
		return RequestResolver.makeBatched(
			Effect.fn(
				function* (requests) {
					if (withErrors && Math.random() < 0.5) {
						return yield* Effect.fail(undefined)
					}
					yield* Effect.sleep(MINIMUM_LAG_MS)
					for (const request of requests) {
						yield* Ref.update(db, dbValues => ({
							...dbValues,
							map: HashMap.remove(dbValues.map, request.id),
						}))
					}
				},
				(effect, requests) =>
					Effect.matchCauseEffect(effect, {
						onFailure: Effect.fn(error =>
							Effect.forEach(requests, Request.failCause(error)),
						),
						onSuccess: Effect.fn(() =>
							Effect.forEach(requests, Request.succeed(undefined)),
						),
					}),
			),
		)
	}),
)
