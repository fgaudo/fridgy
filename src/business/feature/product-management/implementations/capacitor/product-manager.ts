import * as Arr from 'effect/Array'
import * as Effect from 'effect/Effect'
import * as Either from 'effect/Either'
import { pipe } from 'effect/Function'
import * as Layer from 'effect/Layer'
import * as Option from 'effect/Option'
import * as Request from 'effect/Request'
import * as RequestResolver from 'effect/RequestResolver'

import * as Integer from '@/core/integer/integer.ts'

import { SqliteCapacitorPlugin } from '@/shared/capacitor/sqlite-capacitor-plugin.ts'

import * as ProductManager from '../../interfaces/product-manager.ts'

export const manager = Layer.effect(
	ProductManager.ProductManager,
	Effect.gen(function* () {
		const { addProduct, getAllProductsWithTotal, deleteProductsByIds } =
			yield* SqliteCapacitorPlugin

		return {
			getSortedProducts: Effect.gen(function* () {
				const result = yield* Effect.either(getAllProductsWithTotal)

				if (Either.isLeft(result)) {
					yield* Effect.logError(result.left)
					return yield* Effect.fail(undefined)
				}

				const entries = yield* pipe(
					result.right,
					Arr.map(
						Effect.fn(function* (product) {
							return {
								...product,
								maybeId: yield* Option.match(product.maybeId, {
									onNone: () => Effect.succeed(Option.none<string>()),
									onSome: id =>
										Effect.option(Effect.try(() => JSON.stringify(id))),
								}),
							} as const
						}),
					),
					Effect.all,
				)

				return entries
			}),
			deleteProductById: {
				resolver: RequestResolver.makeBatched<
					ProductManager.DeleteProductById[`Request`],
					never
				>(
					Effect.fn(
						function* (requests) {
							const ids = yield* pipe(
								requests,
								Arr.map(request => request.id),
								Arr.map(
									Effect.fn(function* (id) {
										const parsed = yield* pipe(
											Effect.try(() => JSON.parse(id) as unknown),
											Effect.option,
											Effect.map(
												Option.filter(
													id => typeof id === `number` && Integer.isInteger(id),
												),
											),
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

							const result = yield* Effect.either(deleteProductsByIds(ids))

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
					),
				),
			},
			addProduct: {
				resolver: RequestResolver.fromEffect<
					never,
					ProductManager.AddProduct[`Request`]
				>(
					Effect.fn(function* (product) {
						const result = yield* Effect.either(addProduct(product))

						if (Either.isLeft(result)) {
							yield* Effect.logError(result.left)
							return yield* Effect.fail(undefined)
						}

						yield* Effect.logDebug(`No errors adding the product`)
					}),
				),
			},
		}
	}),
)
