import { pipe } from 'effect'

import {
	E,
	Eff,
	H,
	Int,
	L,
	NETS,
	NNInt,
	O,
	Sc,
} from '@/core/imports.ts'

import { GetSortedProductsService } from '@/app/interfaces/get-sorted-products.ts'

import { CapacitorService } from '../index.ts'

const ProductsListSchema = Sc.Struct({
	total: Sc.Number,
	products: Sc.Array(
		Sc.Struct({
			id: Sc.optional(
				Sc.UndefinedOr(Sc.Number).annotations({
					decodingFallback: H.fallback(undefined),
				}),
			),
			name: Sc.optional(
				Sc.UndefinedOr(Sc.String).annotations({
					decodingFallback: H.fallback(undefined),
				}),
			),
			expirationDate: Sc.optional(
				Sc.UndefinedOr(Sc.Number).annotations({
					decodingFallback: H.fallback(undefined),
				}),
			),
			creationDate: Sc.optional(
				Sc.UndefinedOr(Sc.Number).annotations({
					decodingFallback: H.fallback(undefined),
				}),
			),
		}).annotations({
			decodingFallback: H.fallback({}),
		}),
	),
})

export const query = L.effect(
	GetSortedProductsService,
	Eff.gen(function* () {
		const { db } = yield* CapacitorService

		return Eff.gen(function* () {
			const result = yield* pipe(
				H.tryPromise(() =>
					db.getAllProductsWithTotal(),
				),
				Eff.either,
			)

			if (E.isLeft(result)) {
				yield* H.logError(result.left.toString())
				return yield* Eff.fail([
					result.left.toString(),
				])
			}

			const decodeResult =
				yield* Sc.decodeUnknown(
					ProductsListSchema,
				)(result.right).pipe(Eff.either)

			if (E.isLeft(decodeResult)) {
				yield* H.logError(
					decodeResult.left.toString(),
				)

				return yield* Eff.fail(undefined)
			}

			const totalResult = NNInt.fromNumber(
				decodeResult.right.total,
			)

			if (O.isNone(totalResult)) {
				return yield* Eff.fail(undefined)
			}

			const total = totalResult.value

			const products = yield* Eff.all(
				decodeResult.right.products.map(product =>
					Eff.gen(function* () {
						const {
							id,
							name,
							creationDate,
							expirationDate,
						} = product

						if (
							id === undefined ||
							creationDate === undefined ||
							name === undefined
						) {
							yield* H.logError(
								'Product is corrupt',
							).pipe(
								Eff.annotateLogs({ product }),
							)

							return {
								isValid: false,
								id: pipe(
									O.fromNullable(id),
									O.map(id => id.toString(10)),
								),
								name: O.fromNullable(name).pipe(
									O.flatMap(NETS.fromString),
								),
							} as const
						}
						const result = O.all([
							NETS.fromString(name),
							Int.fromNumber(id),
							Int.fromNumber(creationDate),
							O.gen(function* () {
								if (
									expirationDate === undefined
								) {
									return O.none()
								}

								const exp = yield* Int.fromNumber(
									expirationDate,
								)

								return O.some(exp)
							}),
						])

						if (O.isNone(result)) {
							yield* H.logError(
								'Product is corrupt',
							).pipe(
								Eff.annotateLogs({ product }),
							)

							return {
								isValid: false,
								id: O.some(id.toString(10)),
								name: NETS.fromString(name),
							} as const
						}

						const [
							nameNonEmpty,
							idInt,
							creationTimestamp,
							expirationTimestamp,
						] = result.value

						return {
							isValid: true,
							id: idInt.toString(10),
							name: nameNonEmpty,
							creationDate: creationTimestamp,
							expirationDate: expirationTimestamp,
						} as const
					}),
				),
			)

			return {
				total,
				products,
			}
		})
	}),
)
