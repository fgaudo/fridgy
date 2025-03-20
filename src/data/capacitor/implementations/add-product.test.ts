import { describe, layer } from '@effect/vitest'

import { Eff, L } from '@/core/imports.ts'
import * as H from '@/core/test-helpers.ts'

import { AddProductService } from '@/app/interfaces/add-product.ts'

import type { FridgySqlitePlugin } from '../fridgy-sqlite-plugin.ts'
import { CapacitorService } from '../index.ts'
import { command as addProductCommand } from './add-product.ts'

describe('Add product', () => {
	layer(
		L.provide(
			addProductCommand,
			L.succeed(CapacitorService, {
				db: {
					addProduct: () => Promise.resolve(),
				} as unknown as FridgySqlitePlugin,
			}),
		),
	)(({ effect }) => {
		effect.prop(
			'Should just work',
			{
				name: H.nonEmptyTrimmedString,
				expirationDate: H.maybeInteger,
				creationDate: H.integer,
			},
			({ name, expirationDate, creationDate }) =>
				Eff.gen(function* () {
					const service = yield* AddProductService

					const exit = yield* Eff.exit(
						service({
							name,
							expirationDate,
							creationDate,
						}),
					)

					H.assertExitIsSuccess(exit)
				}),
		)
	})

	layer(
		L.provide(
			addProductCommand,
			L.succeed(CapacitorService, {
				db: {
					addProduct: () =>
						Promise.reject(new Error()),
				} as unknown as FridgySqlitePlugin,
			}),
		),
	)(({ effect }) => {
		effect.prop(
			'Should return an error',
			{
				name: H.nonEmptyTrimmedString,
				expirationDate: H.maybeInteger,
				creationDate: H.integer,
			},
			({ name, expirationDate, creationDate }) =>
				Eff.gen(function* () {
					const service = yield* AddProductService

					const exit = yield* Eff.exit(
						service({
							name,
							expirationDate,
							creationDate,
						}),
					)

					H.assertExitIsFailure(exit)
				}),
		)
	})

	layer(
		L.provide(
			addProductCommand,
			L.succeed(CapacitorService, {
				db: {
					addProduct: () => {
						throw new Error()
					},
				} as unknown as FridgySqlitePlugin,
			}),
		),
	)(({ effect }) => {
		effect.prop(
			'Should crash',
			{
				name: H.nonEmptyTrimmedString,
				expirationDate: H.maybeInteger,
				creationDate: H.integer,
			},
			({ name, expirationDate, creationDate }) =>
				Eff.gen(function* () {
					const service = yield* AddProductService

					const exit = yield* Eff.exit(
						service({
							name,
							expirationDate,
							creationDate,
						}),
					)

					H.assertExitIsDie(exit)
				}),
		)
	})
})
