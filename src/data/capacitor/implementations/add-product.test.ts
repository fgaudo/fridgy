import { test } from '@fast-check/vitest'
import { describe } from 'vitest'

import {
	Eff,
	Int,
	L,
	NETS,
	O,
} from '@/core/imports.ts'
import * as H from '@/core/test-helpers.ts'
import { testRuntime } from '@/core/utils.ts'

import { AddProductService } from '@/app/interfaces/add-product.ts'

import type { FridgySqlitePlugin } from '../fridgy-sqlite-plugin.ts'
import { CapacitorService } from '../index.ts'
import { command } from './add-product.ts'

const mockUsecase = ({
	name,
	expirationDate,
	creationDate,
}: {
	name: NETS.NonEmptyTrimmedString
	expirationDate: O.Option<Int.Integer>
	creationDate: Int.Integer
}) =>
	Eff.gen(function* () {
		return yield* (yield* AddProductService)({
			name,
			expirationDate,
			creationDate,
		})
	})

describe('Add product', () => {
	test.concurrent.prop([
		H.nonEmptyTrimmedString,
		H.maybeInteger,
		H.integer,
	])(
		'Should just work',
		async (
			name,
			expirationDate,
			creationDate,
		) => {
			const addProduct = Eff.provide(
				mockUsecase({
					name,
					expirationDate,
					creationDate,
				}),
				command.pipe(
					L.provide(
						L.succeed(CapacitorService, {
							db: {
								addProduct: () =>
									Promise.resolve(),
							} as unknown as FridgySqlitePlugin,
						}),
					),
				),
			)

			const exit =
				await testRuntime.runPromiseExit(
					addProduct,
				)

			H.assertExitIsSuccess(exit)
		},
	)

	test.concurrent.prop([
		H.nonEmptyTrimmedString,
		H.maybeInteger,
		H.integer,
	])(
		'Should return an error',
		async (
			name,
			expirationDate,
			creationDate,
		) => {
			const addProduct = Eff.provide(
				mockUsecase({
					name,
					expirationDate,
					creationDate,
				}),
				command.pipe(
					L.provide(
						L.succeed(CapacitorService, {
							db: {
								addProduct: () =>
									Promise.reject(new Error()),
							} as unknown as FridgySqlitePlugin,
						}),
					),
				),
			)

			const data =
				await testRuntime.runPromiseExit(
					addProduct,
				)

			H.assertExitIsFailure(data)
		},
	)

	test.concurrent.prop([
		H.nonEmptyTrimmedString,
		H.maybeInteger,
		H.integer,
	])(
		'Should crash',
		async (
			name,
			expirationDate,
			creationDate,
		) => {
			const addProduct = Eff.provide(
				mockUsecase({
					name,
					expirationDate,
					creationDate,
				}),
				command.pipe(
					L.provide(
						L.succeed(CapacitorService, {
							db: {
								addProduct: () => {
									throw new Error()
								},
							} as unknown as FridgySqlitePlugin,
						}),
					),
				),
			)

			const data =
				await testRuntime.runPromiseExit(
					addProduct,
				)

			H.assertExitIsDie(data)
		},
	)
})
