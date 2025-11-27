import * as Cause from 'effect/Cause'
import * as Data from 'effect/Data'
import * as Duration from 'effect/Duration'
import * as Effect from 'effect/Effect'
import * as Either from 'effect/Either'
import { pipe } from 'effect/Function'
import * as Option from 'effect/Option'
import * as Req from 'effect/Request'
import * as RequestResolver from 'effect/RequestResolver'
import * as Schema from 'effect/Schema'

import * as Integer from '@/core/integer/integer.ts'
import * as NonEmptyTrimmedString from '@/core/non-empty-trimmed-string.ts'

import * as SqliteCapacitorPlugin from './sqlite-capacitor-plugin.ts'

const DEFAULT_TIMEOUT: Duration.DurationInput = '5 seconds'

/////
/////

type GetAllProductsWithTotal = {
	Failed: Data.TaggedEnum<{
		FetchingFailed: object
		InvalidDataReceived: object
	}>

	Succeeded: Iterable<{
		maybeId: Option.Option<number>
		maybeName: Option.Option<NonEmptyTrimmedString.NonEmptyTrimmedString>
		maybeExpirationDate: Option.Option<Integer.Integer>
		maybeCreationDate: Option.Option<Integer.Integer>
	}>
}

export const GetAllProductsWithTotal = {
	Failed: Data.taggedEnum<GetAllProductsWithTotal['Failed']>(),
}

/////
/////

interface AddProductRequest
	extends Req.Request<void, Cause.UnknownException | Cause.TimeoutException> {
	name: string
	creationDate: number
	maybeExpirationDate: Option.Option<number>
}

export type AddProduct = {
	Request: AddProductRequest
}
export const AddProduct = {
	Request: Req.of<AddProductRequest>(),
}

/////
/////

interface DeleteProductRequest
	extends Req.Request<void, Cause.UnknownException | Cause.TimeoutException> {
	id: number
}

export type DeleteProductById = {
	Request: DeleteProductRequest
}

export const DeleteProductById = {
	Request: Req.of<DeleteProductRequest>(),
}

/////
/////

export class Service extends Effect.Service<Service>()(
	`shared/capacitor/sqlite-capacitor-helper`,
	{
		effect: Effect.gen(function* () {
			const plugin = yield* SqliteCapacitorPlugin.Service

			const mutex = yield* Effect.makeSemaphore(1)

			const [getAllProductsWithTotal, invalidate] =
				yield* Effect.cachedInvalidateWithTTL(
					Effect.gen(function* (): Effect.fn.Return<
						GetAllProductsWithTotal['Succeeded'],
						GetAllProductsWithTotal['Failed']
					> {
						const result = yield* Effect.either(
							Effect.timeout(
								mutex.withPermits(1)(plugin.getAllProductsWithTotal),
								DEFAULT_TIMEOUT,
							),
						)

						if (Either.isLeft(result)) {
							yield* Effect.logDebug(result.left)
							return yield* Effect.fail(
								GetAllProductsWithTotal.Failed.FetchingFailed(),
							)
						}

						const decodeResult = yield* pipe(
							Schema.decodeUnknown(
								SqliteCapacitorPlugin.GetAllProductsWithTotalDTO,
							)(result.right),
							Effect.either,
						)

						if (Either.isLeft(decodeResult)) {
							return yield* Effect.fail(
								GetAllProductsWithTotal.Failed.InvalidDataReceived(),
							)
						}

						return decodeResult.right.products
					}),
					Duration.infinity,
				)

			const deleteByIds = Effect.fn(
				function* (
					ids: Parameters<typeof plugin.deleteProductsByIds>[0]['ids'],
				) {
					const result = yield* plugin.deleteProductsByIds({
						ids,
					})
					yield* invalidate
					return result
				},
				mutex.withPermits(1),
				Effect.timeout(DEFAULT_TIMEOUT),
			)

			const addProduct = Effect.fn(
				function* (
					product: Parameters<typeof plugin.addProduct>[0]['product'],
				) {
					const result = yield* plugin.addProduct({
						product,
					})
					yield* invalidate
					return result
				},
				mutex.withPermits(1),
				Effect.timeout(DEFAULT_TIMEOUT),
			)

			return {
				addProduct: {
					resolver: RequestResolver.fromEffect<never, AddProduct[`Request`]>(
						Effect.fn(function* (request) {
							return yield* addProduct({
								...request,
								expirationDate: Option.isSome(request.maybeExpirationDate)
									? request.maybeExpirationDate.value
									: undefined,
							})
						}),
					),
				},

				deleteProductById: {
					resolver: RequestResolver.makeBatched<
						DeleteProductById[`Request`],
						never
					>(
						Effect.fn(
							function* (requests) {
								return yield* deleteByIds(requests.map(({ id }) => id))
							},
							(effect, requests) =>
								Effect.matchCauseEffect(effect, {
									onFailure: err =>
										Effect.forEach(requests, Req.failCause(err)),
									onSuccess: () =>
										Effect.forEach(requests, Req.succeed(undefined)),
								}),
						),
					),
				},

				getAllProductsWithTotal,
			}
		}),
		dependencies: [SqliteCapacitorPlugin.Service.Default],
	},
) {}
