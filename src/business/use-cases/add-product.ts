import * as Clock from 'effect/Clock'
import * as Data from 'effect/Data'
import * as Effect from 'effect/Effect'
import { pipe } from 'effect/Function'
import * as Layer from 'effect/Layer'
import * as Option from 'effect/Option'
import * as ServiceMap from 'effect/ServiceMap'
import { v4 as uuidv4 } from 'uuid'

import * as Integer from '@/core/integer/integer.ts'

import * as Product from '@/domain/product.ts'
import { AddProduct as AddProductPort } from '@/ports/index.ts'

/////
/////

type AddProductParams = {
	maybeName: Option.Option<string>
	maybeExpirationDate: Option.Option<Integer.Integer>
}

/////
/////

export type Response = Data.TaggedEnum<{
	Succeeded: object
	Failed: object
}>

const Response = Data.taggedEnum<Response>()

/////
/////

export class AddProduct extends ServiceMap.Service<AddProduct>()(
	'53e92243bb8435c7',
	{
		make: Effect.gen(function* () {
			const addProduct = Effect.request(
				(yield* AddProductPort.AddProduct).resolver,
			)

			return {
				run: Effect.fn(function* (
					productData: AddProductParams,
				): Effect.fn.Return<Response> {
					const timestamp = Integer.unsafeFromNumber(
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
						AddProductPort.Request({ id, product: Product.toState(product) }),
						addProduct,
						Effect.option,
					)

					if (Option.isNone(maybeResult)) {
						return Response.Failed()
					}

					yield* Effect.logInfo(
						`Successfully added product with id ${maybeResult.value}`,
					)
					return Response.Succeeded()
				}, Effect.withLogSpan('AddProduct')),
			}
		}),
	},
) {
	static layer = Layer.effect(this, this.make)
}
