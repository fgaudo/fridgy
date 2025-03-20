import { describe, layer } from '@effect/vitest'

import {
	Eff,
	HS,
	L,
	NEHS,
} from '@/core/imports.ts'
import * as H from '@/core/test-helpers.ts'

import { DeleteProductsByIdsService } from '@/app/interfaces/delete-products-by-ids.ts'

import type { FridgySqlitePlugin } from '../fridgy-sqlite-plugin.ts'
import { CapacitorService } from '../index.ts'
import { command } from './delete-products-by-ids.ts'

describe('Delete products by ids', () => {
	layer(
		L.provide(
			command,
			L.succeed(CapacitorService, {
				db: {
					deleteProductsByIds: () =>
						Promise.resolve(undefined),
				} as unknown as FridgySqlitePlugin,
			}),
		),
	)(({ effect }) => {
		effect('Should just work', () =>
			Eff.gen(function* () {
				const service =
					yield* DeleteProductsByIdsService

				const exit = yield* Eff.exit(
					service(
						NEHS.unsafe_fromHashSet(
							HS.fromIterable(['1', '2']),
						),
					),
				)

				H.assertExitIsSuccess(exit)
			}),
		)
	})

	layer(
		L.provide(
			command,
			L.succeed(CapacitorService, {
				db: {} as unknown as FridgySqlitePlugin,
			}),
		),
	)(({ effect }) => {
		effect('Should return an error', () =>
			Eff.gen(function* () {
				const service =
					yield* DeleteProductsByIdsService

				const exit = yield* Eff.exit(
					service(
						NEHS.unsafe_fromHashSet(
							HS.fromIterable(['id']),
						),
					),
				)

				H.assertExitIsFailure(exit)
			}),
		)
	})

	layer(
		L.provide(
			command,
			L.succeed(CapacitorService, {
				db: {
					deleteProductsByIds: () =>
						Promise.reject(new Error()),
				} as unknown as FridgySqlitePlugin,
			}),
		),
	)(({ effect }) => {
		effect('Should return an error', () =>
			Eff.gen(function* () {
				const service =
					yield* DeleteProductsByIdsService

				const exit = yield* Eff.exit(
					service(
						NEHS.unsafe_fromHashSet(
							HS.fromIterable(['1']),
						),
					),
				)

				H.assertExitIsFailure(exit)
			}),
		)
	})

	layer(
		L.provide(
			command,
			L.succeed(CapacitorService, {
				db: {
					deleteProductsByIds: () => {
						throw new Error()
					},
				} as unknown as FridgySqlitePlugin,
			}),
		),
	)(({ effect }) => {
		effect('Should crash', () =>
			Eff.gen(function* () {
				const service =
					yield* DeleteProductsByIdsService

				const exit = yield* Eff.exit(
					service(
						NEHS.unsafe_fromHashSet(
							HS.fromIterable(['1']),
						),
					),
				)

				H.assertExitIsDie(exit)
			}),
		)
	})
})
