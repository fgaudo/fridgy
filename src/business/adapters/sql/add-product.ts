import * as Effect from 'effect/Effect'
import { pipe } from 'effect/Function'
import * as Layer from 'effect/Layer'
import * as Option from 'effect/Option'
import * as Request from 'effect/Request'
import * as RequestResolver from 'effect/RequestResolver'
import * as SqlResolver from 'effect/unstable/sql/SqlResolver'

import type * as Integer from '@/core/integer/integer.ts'
import * as AddProduct from '@/ports/add-product.ts'

import * as SqlDb from './sql-db.ts'

const makeAddProductResolver = Effect.gen(function* () {
	const { productRepository, insertProductWithExpirationResolver } =
		yield* SqlDb.SqlDb
	return RequestResolver.makeGrouped<
		AddProduct.Request,
		Option.Option<Integer.Integer>
	>({
		key: entry => entry.request.product.maybeExpirationDate,
		resolver: Effect.fn(function* (entries, maybeExpirationDate) {
			const maybeProducts = yield* pipe(
				entries,
				Option.isNone(maybeExpirationDate)
					? Effect.forEach(entry =>
							productRepository.insert({
								name: entry.request.product.name,
								creationDate: entry.request.product.creationDate,
							}),
						)
					: Effect.forEach(entry =>
							SqlResolver.request(
								{
									name: entry.request.product.name,
									creationDate: entry.request.product.creationDate,
									expirationDate: maybeExpirationDate.value,
								},
								insertProductWithExpirationResolver,
							),
						),
				Effect.option,
			)
			if (Option.isNone(maybeProducts)) {
				return yield* Effect.forEach(entries, Request.fail(undefined))
			}
			return yield* Effect.forEach(entries, (entry, index) =>
				Request.succeed(entry, maybeProducts.value[index]!.id.toString(10)),
			)
		}),
	})
})

export const layer = Layer.provide(
	Layer.effect(AddProduct.AddProduct, makeAddProductResolver),
	SqlDb.SqlDb.layer,
)
