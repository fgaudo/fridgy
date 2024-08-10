import { fallback } from '@/core/helper'
import { E, Eff, O, Sc } from '@/core/imports'

import {
	type AddProductDTO,
	AddProductServiceError,
} from '@/app/interfaces/write/add-product'

import { CapacitorService } from '..'

export const addProductSchema = Sc.Union(
	Sc.Struct({
		_tag: Sc.Literal('Right'),
		right: Sc.optional(Sc.Unknown),
	}),
	Sc.Struct({
		_tag: Sc.Literal('Left'),
		left: Sc.String.annotations({
			decodingFallback: fallback('Unknown Error'),
		}),
	}),
).annotations({
	decodingFallback: fallback({
		_tag: 'Left',
		left: 'Bad response given',
	}),
})

export const addProduct: (
	product: AddProductDTO,
) => Eff.Effect<
	void,
	AddProductServiceError,
	CapacitorService
> = product =>
	Eff.gen(function* () {
		const { db } = yield* CapacitorService

		const result = yield* Eff.tryPromise(() =>
			db.addProduct({
				product: {
					name: product.name,
					creationDate: product.creationDate,
					...(O.isSome(product.expirationDate)
						? {
								expirationDate:
									product.expirationDate.value,
							}
						: {}),
				},
			}),
		).pipe(Eff.either)

		if (E.isLeft(result)) {
			yield* Eff.logError(result.left)
			return yield* Eff.fail(
				AddProductServiceError(
					'There was a problem with the request',
				),
			)
		}

		yield* Eff.log('No errors adding the product')
	})
