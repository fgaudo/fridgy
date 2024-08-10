import { fallback } from '@/core/helper'
import {
	A,
	E,
	Eff,
	H,
	Sc,
	pipe,
} from '@/core/imports'

import { DeleteProductsByIdsServiceError } from '@/app/interfaces/write/delete-products-by-ids'

import { CapacitorService } from '..'

export const DeleteProductsSchema = Sc.Union(
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

export const deleteProductsByIds: (
	ids: H.HashSet<string>,
) => Eff.Effect<
	void,
	DeleteProductsByIdsServiceError,
	CapacitorService
> = ids =>
	Eff.gen(function* () {
		const { db } = yield* CapacitorService

		const idsArray = pipe(
			A.fromIterable(ids),
			A.map(id => parseInt(id, 10)),
		)

		yield* Eff.log(
			`About to delete ${idsArray.length.toString(
				10,
			)} products`,
		)

		const result = yield* Eff.tryPromise(() =>
			db.deleteProductsByIds({ ids: idsArray }),
		).pipe(Eff.either)

		const data = E.isRight(result)
			? result.right
			: yield* pipe(
					Eff.logError(result.left),
					Eff.andThen(
						Eff.fail(
							DeleteProductsByIdsServiceError(
								'There was a problem while performing the request',
							),
						),
					),
				)

		const decodeResult = yield* Sc.decodeUnknown(
			DeleteProductsSchema,
		)(data).pipe(Eff.either)

		const decoded = E.isRight(decodeResult)
			? decodeResult.right
			: yield* pipe(
					Eff.logError(
						decodeResult.left.toString(),
					),
					Eff.andThen(
						Eff.fail(
							DeleteProductsByIdsServiceError(
								'There was an error while decoding the response',
							),
						),
					),
				)

		if (decoded._tag === 'Left') {
			yield* Eff.logError(decoded.left)
			return yield* Eff.fail(
				DeleteProductsByIdsServiceError(
					'There was a problem while deleting the products',
				),
			)
		}

		yield* Eff.log(
			'No problems while deleting products',
		)
	})
