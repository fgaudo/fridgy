import * as Arr from 'effect/Array'
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
									return yield* Request.succeed(request, false)
								}

								const result = yield* Effect.either(
									Effect.request(
										SqliteCapacitorHelper.DeleteProductById.Request({
											id: parsed.value,
										}),
										deleteResolver,
									),
								)

								if (Either.isLeft(result)) {
									return yield* Request.succeed(request, false)
								}

								return yield* Request.succeed(request, true)
							},
							(effect, request) =>
								Effect.catchAllCause(effect, cause =>
									Request.failCause(request, cause),
								),
						),
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
								const result = yield* Effect.either(
									Effect.request(
										SqliteCapacitorHelper.AddProduct.Request(request),
										addProductResolver,
									),
								)

								if (Either.isLeft(result)) {
									return yield* Request.succeed(request, false)
								}

								return yield* Request.succeed(request, true)
							},
							(effect, request) =>
								Effect.catchAllCause(effect, cause =>
									Request.failCause(request, cause),
								),
						),
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
