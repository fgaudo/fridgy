import * as Clock from 'effect/Clock'
import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import { pipe } from 'effect/Function'
import * as Layer from 'effect/Layer'
import * as Option from 'effect/Option'
import * as ServiceMap from 'effect/ServiceMap'
import { v4 as uuidv4 } from 'uuid'

import * as Product from '@/business/domain/product.ts'
import * as Integer from '@/core/integer/integer.ts'
import * as AddProductPort from '@/ports/add-product.ts'

export type Params = {
	maybeName: Option.Option<string>
	maybeExpirationDate: Option.Option<Integer.Integer>
}

export type Response = Data.TaggedEnum<{
	Succeeded: object
	Failed: object
}>
const Response = Data.taggedEnum<Response>()

export class AddProduct extends ServiceMap.Service<AddProduct>()(
	'377381c9a32b5ed1',
	{
		make: Effect.gen(function* () {
			const resolver = yield* AddProductPort.AddProduct
			return Effect.fn(function* (
				productData: Params,
			): Effect.fn.Return<Response> {
				const timestamp = Integer.fromNumberUnsafe(
					yield* Clock.currentTimeMillis,
				)
				const maybeProduct = Product.makeProduct({
					maybeName: productData.maybeName,
					maybeCreationDate: Option.some(timestamp),
					maybeExpirationDate: productData.maybeExpirationDate,
				})
				if (Option.isNone(maybeProduct)) {
					yield* Effect.logError('Product is invalid')
					return Response.Failed()
				}
				const product = maybeProduct.value
				yield* Effect.logInfo(
					`Attempting to add product "${Product.name(product)}"...`,
				)
				const id = yield* Effect.sync(() => uuidv4())
				const maybeResult = yield* pipe(
					AddProductPort.Request({ id, product: Product.toOutput(product) }),
					Effect.request(resolver),
					Effect.option,
				)
				if (Option.isNone(maybeResult)) {
					return Response.Failed()
				}
				yield* Effect.logInfo(
					`Successfully added product with id ${maybeResult.value}`,
				)
				return Response.Succeeded()
			}, Effect.withLogSpan('AddProduct'))
		}),
	},
) {
	static layer = Layer.effect(this, this.make)
}
