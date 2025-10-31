import * as Array from 'effect/Array'
import * as Effect from 'effect/Effect'
import { pipe } from 'effect/Function'
import * as HashMap from 'effect/HashMap'
import * as Layer from 'effect/Layer'
import * as Option from 'effect/Option'
import * as Order from 'effect/Order'
import * as Ref from 'effect/Ref'

import { withLayerLogging } from '$lib/core/logging.ts'

import { GetSortedProducts } from '$lib/business/app/operations.ts'

import { Config } from '../config.ts'
import { Db } from '../db.ts'

const ord = Order.make(
	Order.combineAll([
		pipe(
			Order.number,
			Order.reverse,
			Option.getOrder,
			Order.reverse,
			Order.mapInput(
				(product: GetSortedProducts.ProductDTO) => product.maybeExpirationDate,
			),
		),
		pipe(
			Order.string,
			Option.getOrder,
			Order.mapInput(
				(product: GetSortedProducts.ProductDTO) => product.maybeName,
			),
		),
	]),
)

export const query = Layer.effect(
	GetSortedProducts.Tag,
	Effect.gen(function* () {
		const withErrors = yield* Config.withErrors
		const db = yield* Db
		return Effect.gen(function* () {
			if (withErrors && Math.random() < 0.5)
				return yield* new GetSortedProducts.InvalidDataReceived()

			const map = yield* Ref.get(db).pipe(Effect.map(({ map }) => map))

			const products: GetSortedProducts.ProductDTO[] = map.pipe(
				HashMap.toValues,
			)

			return Array.sort(products, ord)
		}).pipe(withLayerLogging(`I`))
	}),
)
