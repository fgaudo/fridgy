import { pipe } from 'effect'

import { fallback } from '@/core/helper'
import { E, Eff, O, Sc } from '@/core/imports'

import {
	type ProductDTO,
	ProductsServiceError,
} from '@/app/interfaces/read/get-sorted-products'

import { CapacitorService } from '..'

const ProductsListSchema = Sc.Union(
	Sc.Struct({
		_tag: Sc.Literal('Left'),
		left: Sc.String.annotations({
			decodingFallback: fallback('Unknown error'),
		}),
	}),
	Sc.Struct({
		_tag: Sc.Literal('Right'),
		right: Sc.Struct({
			total: Sc.Number,
			items: Sc.Array(
				Sc.Struct({
					id: Sc.optional(
						Sc.UndefinedOr(Sc.Number).annotations(
							{
								decodingFallback:
									fallback(undefined),
							},
						),
					),
					name: Sc.optional(
						Sc.UndefinedOr(Sc.String).annotations(
							{
								decodingFallback:
									fallback(undefined),
							},
						),
					),
					expirationDate: Sc.optional(
						Sc.UndefinedOr(Sc.Number).annotations(
							{
								decodingFallback:
									fallback(undefined),
							},
						),
					),
					creationDate: Sc.optional(
						Sc.UndefinedOr(Sc.Number).annotations(
							{
								decodingFallback:
									fallback(undefined),
							},
						),
					),
				}).annotations({
					decodingFallback: fallback({}),
				}),
			),
		}),
	}),
).annotations({
	decodingFallback: fallback({
		_tag: 'Left',
		left: 'Bad response',
	}),
})

export const query: Eff.Effect<
	{
		total: number
		products: ProductDTO[]
	},
	ProductsServiceError,
	CapacitorService
> = Eff.gen(function* () {
	const { db } = yield* CapacitorService

	const result = yield* pipe(
		Eff.tryPromise(() =>
			db.getAllProductsWithTotal(),
		),
		Eff.either,
	)

	const data = E.isRight(result)
		? result.right
		: yield* pipe(
				Eff.logError(result.left.toString()),
				Eff.andThen(
					Eff.fail(
						ProductsServiceError(
							'There was an error while getting the data',
						),
					),
				),
			)

	const decodeResult = yield* Sc.decodeUnknown(
		ProductsListSchema,
	)(data).pipe(Eff.either)

	const decoded = E.isRight(decodeResult)
		? decodeResult.right
		: yield* pipe(
				Eff.logError(
					decodeResult.left.toString(),
				),
				Eff.andThen(
					Eff.fail(
						ProductsServiceError(
							'There was an error while decoding the data',
						),
					),
				),
			)

	const response =
		decoded._tag === 'Right'
			? decoded.right
			: yield* pipe(
					Eff.logError(decoded.left),
					Eff.andThen(
						Eff.fail(
							ProductsServiceError(
								'There was a problem in the data-fetching',
							),
						),
					),
				)

	const products = yield* Eff.all(
		response.items.map(product =>
			Eff.gen(function* () {
				const { id, name, creationDate } = product

				if (
					id == undefined ||
					creationDate == undefined ||
					name == undefined
				) {
					yield* Eff.logError(
						'Product is corrupt',
					).pipe(Eff.annotateLogs({ product }))

					return {
						isValid: false,
						id: pipe(
							O.fromNullable(product.id),
							O.map(id => id.toString(10)),
						),
						name: O.fromNullable(product.name),
					} as const
				}

				return {
					isValid: true,
					id: id.toString(10),
					name,
					creationDate,
					expirationDate: O.fromNullable(
						product.expirationDate,
					),
				} as const
			}),
		),
	)

	return { total: response.total, products }
})
