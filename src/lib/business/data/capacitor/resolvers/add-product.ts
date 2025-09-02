import * as Effect from 'effect/Effect'
import * as Either from 'effect/Either'
import * as Layer from 'effect/Layer'
import * as Option from 'effect/Option'
import * as ParseResult from 'effect/ParseResult'
import * as RequestResolver from 'effect/RequestResolver'
import * as Schema from 'effect/Schema'

import { withLayerLogging } from '$lib/core/logging.ts'

import { AddProduct } from '$lib/business/app/operations.ts'

import { DbPlugin } from '../db-plugin.ts'

const DtoToBackend = Schema.transformOrFail(
	Schema.Struct({
		product: Schema.Struct({
			name: Schema.String,
			creationDate: Schema.Number,
			expirationDate: Schema.UndefinedOr(Schema.Number),
		}),
	}),
	Schema.Struct(AddProduct.Request.fields),
	{
		strict: true,
		encode: (_, __, ___, product) =>
			ParseResult.succeed({
				product: {
					name: product.name,
					creationDate: product.creationDate,
					expirationDate: Option.getOrUndefined(product.maybeExpirationDate),
				},
			}),
		decode: (actual, _, ast) =>
			ParseResult.fail(
				new ParseResult.Forbidden(
					ast,
					actual,
					`This transformer is only for encoding`,
				),
			),
	},
)

export const command = Layer.effect(
	AddProduct.Resolver,
	Effect.gen(function* () {
		const { addProduct } = yield* DbPlugin

		return RequestResolver.fromEffect(product =>
			Effect.gen(function* () {
				const dto = yield* Schema.encode(DtoToBackend)(product).pipe(
					Effect.either,
				)

				if (Either.isLeft(dto)) {
					return yield* Effect.die(dto.left)
				}
				const result = yield* Effect.either(addProduct(dto.right))

				if (Either.isLeft(result)) {
					yield* Effect.logError(result.left)
					return yield* Effect.fail(undefined)
				}

				yield* Effect.logDebug(`No errors adding the product`)
			}).pipe(withLayerLogging(`I`)),
		)
	}),
)
