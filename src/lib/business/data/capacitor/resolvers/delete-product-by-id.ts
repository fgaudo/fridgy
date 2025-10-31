import * as Array from 'effect/Array'
import * as Effect from 'effect/Effect'
import * as Either from 'effect/Either'
import { pipe } from 'effect/Function'
import * as Layer from 'effect/Layer'
import * as Option from 'effect/Option'
import * as Request from 'effect/Request'
import * as RequestResolver from 'effect/RequestResolver'

import { withLayerLogging } from '$lib/core/logging.ts'

import { DeleteProductById } from '$lib/business/app/operations.ts'

import { DbPlugin } from '../db-plugin.ts'

export const command = Layer.effect(
	DeleteProductById.Resolver,
	Effect.gen(function* () {
		const { deleteProductsByIds } = yield* DbPlugin

		return RequestResolver.makeBatched(
			Effect.fn(
				function* (requests) {
					const ids = yield* pipe(
						requests,
						Array.map(request => request.id),
						Array.map(
							Effect.fn(function* (id) {
								const parsed = yield* pipe(
									Effect.try(() => JSON.parse(id) as unknown),
									Effect.option,
									Effect.map(Option.filter(id => typeof id === `number`)),
								)

								if (Option.isSome(parsed)) {
									return parsed.value
								}

								yield* Effect.logWarning(
									`Id has incorrect format. Skipping.`,
								).pipe(Effect.annotateLogs({ id }))

								return yield* Effect.fail(undefined)
							}),
						),
						Effect.allSuccesses,
					)

					yield* Effect.logDebug(
						`About to delete ${ids.length.toString(10)} products`,
					)

					const result = yield* Effect.either(
						deleteProductsByIds({
							ids,
						}),
					)

					if (Either.isLeft(result)) {
						yield* Effect.logError(result.left)
						return yield* Effect.fail(undefined)
					}

					return result.right
				},
				(effect, requests) =>
					Effect.matchCauseEffect(effect, {
						onFailure: Effect.fn(err =>
							Effect.forEach(requests, Request.failCause(err)),
						),
						onSuccess: Effect.fn(() =>
							Effect.forEach(requests, Request.succeed(undefined)),
						),
					}),
				withLayerLogging(`I`),
			),
		)
	}),
)
