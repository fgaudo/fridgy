import { ParseResult } from 'effect'

import { E, Eff, L, LL, O, RR, Sc } from '$lib/core/imports.ts'

import { AddProduct } from '$lib/business/app/operations.ts'

import { Deps } from '../../deps.ts'
import { DbPlugin } from '../db-plugin.ts'

const DtoToBackend = Sc.transformOrFail(
	Sc.Struct({
		product: Sc.Struct({
			name: Sc.String,
			creationDate: Sc.Number,
			expirationDate: Sc.UndefinedOr(Sc.Number),
		}),
	}),
	AddProduct.ProductDTO,
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
		const { log } = yield* Deps

		return RR.fromEffect(product =>
			Eff.gen(function* () {
				const dto = yield* Sc.encodeEither(DtoToBackend)(product).pipe(
					Eff.catchTags({ ParseError: Eff.die }),
				)

				const result = yield* Eff.either(addProduct(dto))

				if (E.isLeft(result)) {
					yield* Eff.logError(result.left.error)
					return yield* new AddProduct.OperationFailed()
				}

				yield* log(LL.Debug, `No errors adding the product`)
			}),
		)
	}),
)
