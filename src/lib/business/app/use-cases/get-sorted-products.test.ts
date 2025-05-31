import { describe, effect, layer } from '@effect/vitest'

import { Eff, L } from '$lib/core/imports.ts'
import * as H from '$lib/core/test-helpers.ts'

import { GetSortedProducts as Query } from '$lib/business/app/operations.ts'

import {
	FetchingFailed,
	InvalidDataReceived,
} from '../operations/get-sorted-products.ts'
import * as Usecase from './get-sorted-products.ts'

describe.concurrent(`Get sorted products`, () => {
	layer(
		L.provide(
			Usecase.GetSortedProducts.Default,
			L.succeed(Query.Tag, Eff.fail(new FetchingFailed())),
		),
	)(({ effect }) => {
		effect(`Should return an error`, () =>
			Eff.gen(function* () {
				const service = yield* Usecase.GetSortedProducts
				const exit = yield* Eff.exit(service)
				H.assertExitIsFailure(exit)
			}),
		)
	})

	layer(
		L.provide(
			Usecase.GetSortedProducts.Default,
			L.succeed(Query.Tag, Eff.fail(new InvalidDataReceived())),
		),
	)(({ effect }) => {
		effect(`Should return an error`, () =>
			Eff.gen(function* () {
				const service = yield* Usecase.GetSortedProducts
				const exit = yield* Eff.exit(service)
				H.assertExitIsFailure(exit)
			}),
		)
	})

	effect.prop(
		`Should always return all elements`,
		[Query.GetSortedProductsDTO],
		([products], { expect }) =>
			Eff.provide(
				Eff.gen(function* () {
					const service = yield* Usecase.GetSortedProducts

					const exit = yield* Eff.exit(service)

					H.assertExitIsSuccess(exit)

					expect(exit.value.length).toStrictEqual(products.length)
				}),
				L.provide(
					Usecase.GetSortedProducts.Default,
					L.succeed(Query.Tag, Eff.succeed(products)),
				),
			),
	)
})
