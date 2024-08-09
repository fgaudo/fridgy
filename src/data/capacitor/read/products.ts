import { pipe } from 'effect'

import { E, Eff, O, Sc } from '@/core/imports'

import { CapacitorService } from '..'
import { fallback } from '../helper'

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
			total: Sc.Number.annotations({
				decodingFallback: fallback(0),
			}),
			items: Sc.Array(
				Sc.Struct({
					id: Sc.Number,
					name: Sc.String.annotations({
						decodingFallback: fallback(
							'[UNDEFINED]',
						),
					}),
					expirationDate: Sc.optional(
						Sc.Number.annotations({
							decodingFallback: fallback(0),
						}),
					),
					creationDate: Sc.Number.annotations({
						decodingFallback: fallback(0),
					}),
				}),
			).annotations({
				decodingFallback: fallback([]),
			}),
		}).annotations({
			decodingFallback: fallback({
				total: 0,
				items: [],
			}),
		}),
	}),
).annotations({
	decodingFallback: fallback({
		_tag: 'Left',
		left: 'Bad response',
	}),
})

export const products = Eff.gen(function* () {
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
						'There was an error while getting the data',
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
						'There was an error while decoding the data',
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
							'There was a problem in the data-fetching',
						),
					),
				)

	return {
		total: response.total,
		products: response.items.map(product => ({
			id: product.id.toString(10),
			name: product.name,
			creationDate: product.creationDate,
			expirationDate: O.fromNullable(
				product.expirationDate,
			),
		})),
	}
})
