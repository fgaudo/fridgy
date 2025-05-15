import { describe, effect, layer } from '@effect/vitest'
import { Arbitrary } from 'effect'

import { Eff, L, RR } from '$lib/core/imports.ts'
import * as H from '$lib/core/test-helpers.ts'

import { GetSortedProducts as Query } from '$lib/business/app/operations.ts'

import {
	FetchingFailed,
	InvalidDataReceived,
} from '../operations/get-sorted-products.ts'
import * as Usecase from './get-sorted-products.ts'

describe(`Get sorted products`, () => {
	layer(
		L.provide(
			Usecase.GetSortedProducts.Default,
			L.succeed(
				Query.Resolver,
				RR.fromEffect(() => Eff.fail(new FetchingFailed())),
			),
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
			L.succeed(
				Query.Resolver,
				RR.fromEffect(() => Eff.fail(new InvalidDataReceived())),
			),
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
		`Should return a list`,
		[Arbitrary.make(Query.GetSortedProductsDTO)],
		([products], { expect }) =>
			Eff.provide(
				Eff.gen(function* () {
					const service = yield* Usecase.GetSortedProducts

					const exit = yield* Eff.exit(service)

					H.assertExitIsSuccess(exit)

					expect(exit.value).toStrictEqual(products)
				}),
				L.provide(
					Usecase.GetSortedProducts.Default,
					L.succeed(
						Query.Resolver,
						RR.fromEffect(() => Eff.succeed(products)),
					),
				),
			),
	)
})
