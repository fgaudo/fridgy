import { describe, effect, layer } from '@effect/vitest'

import { Eff, L, NNInt } from '$lib/core/imports.ts'
import * as H from '$lib/core/test-helpers.ts'

import { GetSortedProducts as Query } from '$lib/business/app/operations.ts'

import * as Usecase from './get-sorted-products.ts'

const record = H.FC.oneof(
	H.FC.record(
		{
			isValid: H.FC.constant(true) as H.FC.Arbitrary<true>,
			id: H.string,
			creationDate: H.integer,
			expirationDate: H.maybeInteger,
			name: H.nonEmptyTrimmedString,
		},
		{ noNullPrototype: true },
	),
	H.FC.record(
		{
			isValid: H.FC.constant(false) as H.FC.Arbitrary<false>,
			id: H.maybeString,
			name: H.maybeNonEmptyTrimmedString,
		},
		{ noNullPrototype: true },
	),
)

describe(`Get sorted products`, () => {
	layer(
		L.provide(
			Usecase.useCase,
			L.succeed(Query.GetSortedProducts, Eff.fail(undefined)),
		),
	)(({ effect }) => {
		effect(`Should return an error`, () =>
			Eff.gen(function* () {
				const service = yield* Usecase.Tag
				const exit = yield* Eff.exit(service)
				H.assertExitIsFailure(exit)
			}),
		)
	})

	effect.prop(
		`Should return a list`,
		[record, record, record],
		(products, { expect }) =>
			Eff.provide(
				Eff.gen(function* () {
					const service = yield* Usecase.Tag

					const exit = yield* Eff.exit(service)

					H.assertExitIsSuccess(exit)

					expect(exit.value).toStrictEqual({
						total: NNInt.unsafeFromNumber(products.length),
						models: products,
					})
				}),
				L.provide(
					Usecase.useCase,
					L.succeed(
						Query.GetSortedProducts,
						Eff.succeed({
							total: NNInt.unsafeFromNumber(products.length),
							products,
						}),
					),
				),
			),
	)
})
