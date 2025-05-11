import {
	HashMap,
	Ref,
	RequestResolver,
	pipe,
} from 'effect'

import {
	A,
	Eff,
	L,
	NNInt,
	O,
	Ord,
} from '$lib/core/imports.ts'

import { GetSortedProducts } from '$lib/business/app/operations.ts'

import { Deps } from '../../deps.ts'
import { Config } from '../config.ts'
import { Db } from '../db.ts'

const ord = Ord.make(
	(
		p1: GetSortedProducts.ProductDTO,
		p2: GetSortedProducts.ProductDTO,
	) => {
		return Ord.combineAll([
			pipe(
				Ord.number,
				Ord.reverse,
				O.getOrder,
				Ord.reverse,
				Ord.mapInput(
					(product: typeof p1) =>
						product.maybeExpirationDate,
				),
			),
			pipe(
				Ord.string,
				O.getOrder,
				Ord.mapInput(
					(product: typeof p1) =>
						product.maybeName,
				),
			),
		])(p1, p2)
	},
)

export const query = L.effect(
	GetSortedProducts.Resolver,
	Eff.gen(function* () {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { log } = yield* Deps
		const withErrors = yield* Config.withErrors
		const db = yield* Db
		return RequestResolver.fromEffect(() =>
			Eff.gen(function* () {
				if (withErrors && Math.random() < 0.5)
					return yield* new GetSortedProducts.InvalidDataReceived()

				const map = yield* Ref.get(db).pipe(
					Eff.map(({ map }) => map),
				)

				const total = map.pipe(HashMap.size)

				const products: GetSortedProducts.ProductDTO[] =
					map.pipe(HashMap.toValues)

				return {
					total: NNInt.unsafeFromNumber(total),
					products: A.sort(ord)(products),
				}
			}),
		)
	}),
)
