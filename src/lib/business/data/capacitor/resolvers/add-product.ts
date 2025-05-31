import { ParseResult } from 'effect'

import { E, Eff, L, O, RR, Sc } from '$lib/core/imports.ts'
import { withLayerLogging } from '$lib/core/logging.ts'

import { AddProduct } from '$lib/business/app/operations.ts'

import { DbPlugin } from '../db-plugin.ts'

const DtoToBackend = Sc.transformOrFail(
	Sc.Struct({
		product: Sc.Struct({
			name: Sc.String,
			creationDate: Sc.Number,
			expirationDate: Sc.UndefinedOr(Sc.Number),
		}),
	}),
	Sc.Struct(AddProduct.Request.fields),
	{
		strict: true,
		encode: (_, __, ___, product) =>
			ParseResult.succeed({
				product: {
					name: product.name,
					creationDate: product.creationDate,
					expirationDate: O.getOrUndefined(product.maybeExpirationDate),
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

export const command = L.effect(
	AddProduct.Resolver,
	Eff.gen(function* () {
		const { addProduct } = yield* DbPlugin

		return RR.fromEffect(product =>
			Eff.gen(function* () {
				const dto = yield* Sc.encode(DtoToBackend)(product).pipe(Eff.either)

				if (E.isLeft(dto)) {
					return yield* Eff.die(dto.left)
				}
				const result = yield* Eff.either(addProduct(dto.right))

				if (E.isLeft(result)) {
					yield* Eff.logError(result.left)
					return yield* Eff.fail(undefined)
				}

				yield* Eff.logDebug(`No errors adding the product`)
			}).pipe(withLayerLogging(`I`)),
		)
	}),
)
