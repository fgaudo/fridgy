import { describe, effect, layer } from '@effect/vitest'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'

import * as H from '$lib/core/test-helpers.ts'

import { GetSortedProducts as Query } from '$lib/business/app/operations.ts'

import {
	FetchingFailed,
	InvalidDataReceived,
} from '../operations/get-sorted-products.ts'
import * as Usecase from './get-sorted-products.ts'

describe.concurrent(`Get sorted products`, () => {
	layer(
		Layer.provide(
			Usecase.GetSortedProducts.Default,
			Layer.succeed(Query.Tag, Effect.fail(new FetchingFailed())),
		),
	)(({ effect }) => {
		effect(
			`Should return an error`,
			Effect.fn(function* () {
				const service = yield* Usecase.GetSortedProducts
				const exit = yield* Effect.exit(service)
				H.assertExitIsFailure(exit)
			}),
		)
	})

	layer(
		Layer.provide(
			Usecase.GetSortedProducts.Default,
			Layer.succeed(Query.Tag, Effect.fail(new InvalidDataReceived())),
		),
	)(({ effect }) => {
		effect(
			`Should return an error`,
			Effect.fn(function* () {
				const service = yield* Usecase.GetSortedProducts
				const exit = yield* Effect.exit(service)
				H.assertExitIsFailure(exit)
			}),
		)
	})

	effect.prop(
		`Should always return all elements`,
		[Query.GetSortedProductsDTO],
		Effect.fn(
			function* ([products], { expect }) {
				const service = yield* Usecase.GetSortedProducts

				const exit = yield* Effect.exit(service)

				H.assertExitIsSuccess(exit)

				expect(exit.value.length).toStrictEqual(products.length)
			},
			(effect, [products]) =>
				Effect.provide(
					effect,
					Layer.provide(
						Usecase.GetSortedProducts.Default,
						Layer.succeed(Query.Tag, Effect.succeed(products)),
					),
				),
		),
	)
})
