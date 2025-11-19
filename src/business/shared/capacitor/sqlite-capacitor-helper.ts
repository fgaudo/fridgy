import type * as Cause from 'effect/Cause'
import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import * as Either from 'effect/Either'
import { pipe } from 'effect/Function'
import * as Option from 'effect/Option'
import * as Request from 'effect/Request'
import * as RequestResolver from 'effect/RequestResolver'
import * as Schema from 'effect/Schema'

import * as Integer from '@/core/integer/integer.ts'
import * as NonEmptyTrimmedString from '@/core/non-empty-trimmed-string.ts'

import * as SqliteCapacitorPlugin from './sqlite-capacitor-plugin.ts'

/////
/////

class FetchingFailed extends Data.TaggedError(`FetchingFailed`) {}

class InvalidDataReceived extends Data.TaggedError(`InvalidDataReceived`) {}

const GetAllProductsWithTotalDTO = Schema.Array(
	Schema.Struct({
		maybeCreationDate: Schema.Option(Integer.Schema),
		maybeExpirationDate: Schema.Option(Integer.Schema),
		maybeId: Schema.Option(Schema.Number),
		maybeName: Schema.Option(NonEmptyTrimmedString.Schema),
	}),
)

export type GetAllProductsWithTotal = {
	FetchingFailed: FetchingFailed
	InvalidDataReceived: InvalidDataReceived
	DTO: Schema.Schema.Type<typeof GetAllProductsWithTotalDTO>
}
export const GetAllProductsWithTotal = {
	DTO: GetAllProductsWithTotalDTO,
	FetchingFailed: FetchingFailed,
	InvalidDataReceived: InvalidDataReceived,
}

/////
/////

interface AddProductRequest
	extends Request.Request<void, Cause.UnknownException> {
	name: string
	creationDate: number
	maybeExpirationDate: Option.Option<number>
}

export type AddProduct = {
	Request: AddProductRequest
}
export const AddProduct = {
	Request: Request.of<AddProductRequest>(),
}

/////
/////

interface DeleteProductRequest
	extends Request.Request<void, Cause.UnknownException> {
	id: number
}

export type DeleteProductById = {
	Request: DeleteProductRequest
}

export const DeleteProductById = {
	Request: Request.of<DeleteProductRequest>(),
}

/////
/////

export class Service extends Effect.Service<Service>()(
	`shared/capacitor/sqlite-capacitor-helper`,
	{
		dependencies: [SqliteCapacitorPlugin.Service.Default],
		effect: Effect.gen(function* () {
			const plugin = yield* SqliteCapacitorPlugin.Service

			return {
				addProduct: {
					resolver: RequestResolver.fromEffect<never, AddProduct[`Request`]>(
						Effect.fn(function* (request) {
							return yield* plugin.addProduct({
								product: {
									...request,
									expirationDate: Option.isSome(request.maybeExpirationDate)
										? request.maybeExpirationDate.value
										: undefined,
								},
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
								return yield* plugin.deleteProductsByIds({
									ids: requests.map(({ id }) => id),
								})
							},
							(effect, requests) =>
								Effect.matchCauseEffect(effect, {
									onFailure: err =>
										Effect.forEach(requests, Request.failCause(err)),
									onSuccess: () =>
										Effect.forEach(requests, Request.succeed(undefined)),
								}),
						),
					),
				},

				getAllProductsWithTotal: Effect.gen(function* () {
					const result = yield* Effect.either(plugin.getAllProductsWithTotal)

					if (Either.isLeft(result)) {
						yield* Effect.logError(result.left)
						return yield* new FetchingFailed()
					}

					const decodeResult = yield* pipe(
						Schema.decodeUnknown(
							SqliteCapacitorPlugin.GetAllProductsWithTotalDTO,
						)(result.right),
						Effect.either,
					)

					if (Either.isLeft(decodeResult)) {
						return yield* new InvalidDataReceived()
					}

					return decodeResult.right.products
				}),
			}
		}),
	},
) {}
