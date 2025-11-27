import * as Effect from 'effect/Effect'
import * as Either from 'effect/Either'
import { pipe } from 'effect/Function'
import * as Layer from 'effect/Layer'
import * as Option from 'effect/Option'
import * as Request from 'effect/Request'
import * as RequestResolver from 'effect/RequestResolver'

import * as Integer from '@/core/integer/integer.ts'

import * as SqliteCapacitorHelper from '@/shared/capacitor/sqlite-capacitor-helper.ts'

import * as ProductManager from '../../interfaces/product-manager.ts'

export const layerWithoutDependencies = Layer.effect(
	ProductManager.Service,
	Effect.gen(function* () {
		const {
			addProduct: { resolver: addProductResolver },
			getAllProductsWithTotal,
			deleteProductById: { resolver: deleteResolver },
		} = yield* SqliteCapacitorHelper.Service

		return {
			getSortedProducts: Effect.gen(function* () {
				const result = yield* Effect.either(getAllProductsWithTotal)

				if (Either.isLeft(result)) {
					yield* Effect.logError(result.left)
					return yield* Effect.fail(undefined)
				}

				const entries = yield* Effect.forEach(
					result.right,
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
				)

				return entries
			}),
			deleteProductById: {
				resolver: RequestResolver.makeBatched<
					ProductManager.DeleteProductById['Request'],
					never
				>(
					Effect.forEach(
						Effect.fn(
							function* (request) {
								const parsed = yield* pipe(
									Effect.try(() => JSON.parse(request.id) as unknown),
									Effect.option,
									Effect.map(
										Option.filter(
											id => typeof id === `number` && Integer.isInteger(id),
										),
									),
								)

								if (Option.isNone(parsed)) {
									yield* Effect.logWarning(
										`Id has incorrect format. Skipping.`,
									).pipe(Effect.annotateLogs({ id: request.id }))
									yield* Request.succeed(request, false)
									return false
								}

								const result = yield* Effect.option(
									Effect.request(
										SqliteCapacitorHelper.DeleteProductById.Request({
											id: parsed.value,
										}),
										deleteResolver,
									),
								)

								if (Option.isNone(result)) {
									yield* Request.succeed(request, false)
									return false
								}

								yield* Request.succeed(request, true)
								return true
							},
							(effect, request) =>
								Effect.catchAllCause(
									effect,
									Effect.fn(function* (cause) {
										yield* Request.failCause(request, cause)
										return yield* Effect.failCause(cause)
									}),
								),
						),
						{ batching: true },
					),
				),
			},
			addProduct: {
				resolver: RequestResolver.makeBatched<
					ProductManager.AddProduct[`Request`],
					never
				>(
					Effect.forEach(
						Effect.fn(
							function* (request) {
								const result = yield* Effect.option(
									Effect.request(
										SqliteCapacitorHelper.AddProduct.Request(request),
										addProductResolver,
									),
								)

								if (Option.isNone(result)) {
									yield* Request.succeed(request, false)
									return false
								}

								yield* Request.succeed(request, true)
								return true
							},
							(effect, request) =>
								Effect.catchAllCause(
									effect,
									Effect.fn(function* (cause) {
										yield* Request.failCause(request, cause)
										return yield* Effect.failCause(cause)
									}),
								),
						),
						{ batching: true },
					),
				),
			},
		}
	}),
)

export const layer = Layer.provide(
	layerWithoutDependencies,
	SqliteCapacitorHelper.Service.Default,
)
