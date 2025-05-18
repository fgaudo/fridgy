import { describe, layer } from '@effect/vitest';

import {
	Eff,
	HS,
	L,
	NEHS,
} from '$lib/core/imports.ts';
import * as H from '$lib/core/test-helpers.ts';

import { Capacitor } from '$lib/data/index.ts';

import { DeleteProductsById$lib/business/data/index.tsiness/app/queries.ts';

import { command } from './delete-product-by-id.ts';

describe('Delete products by ids', () => {
	layer(
		L.provide(
			command,
			L.succeed(Capacitor.Tag, {
				db: {
					deleteProductsByIds: () =>
						Promise.resolve(undefined),
				} as unknown as Capacitor.FridgySqlitePlugin,
			}),
		),
	)(({ effect }) => {
		effect('Should just work', () =>
			Eff.gen(function* () {
				const service =
					yield* DeleteProductsByIds.Tag;

				const exit = yield* Eff.exit(
					service(
						NEHS.unsafeFromHashSet(
							HS.fromIterable(['1', '2']),
						),
					),
				);

				H.assertExitIsSuccess(exit);
			}),
		);
	});

	layer(
		L.provide(
			command,
			L.succeed(Capacitor.Tag, {
				db: {} as unknown as Capacitor.FridgySqlitePlugin,
			}),
		),
	)(({ effect }) => {
		effect('Should return an error', () =>
			Eff.gen(function* () {
				const service =
					yield* DeleteProductsByIds.Tag;

				const exit = yield* Eff.exit(
					service(
						NEHS.unsafeFromHashSet(
							HS.fromIterable(['id']),
						),
					),
				);

				H.assertExitIsFailure(exit);
			}),
		);
	});

	layer(
		L.provide(
			command,
			L.succeed(Capacitor.Tag, {
				db: {
					deleteProductsByIds: () =>
						Promise.reject(new Error()),
				} as unknown as Capacitor.FridgySqlitePlugin,
			}),
		),
	)(({ effect }) => {
		effect('Should return an error', () =>
			Eff.gen(function* () {
				const service =
					yield* DeleteProductsByIds.Tag;

				const exit = yield* Eff.exit(
					service(
						NEHS.unsafeFromHashSet(
							HS.fromIterable(['1']),
						),
					),
				);

				H.assertExitIsFailure(exit);
			}),
		);
	});

	layer(
		L.provide(
			command,
			L.succeed(Capacitor.Tag, {
				db: {
					deleteProductsByIds: () => {
						throw new Error();
					},
				} as unknown as Capacitor.FridgySqlitePlugin,
			}),
		),
	)(({ effect }) => {
		effect('Should crash', () =>
			Eff.gen(function* () {
				const service =
					yield* DeleteProductsByIds.Tag;

				const exit = yield* Eff.exit(
					service(
						NEHS.unsafeFromHashSet(
							HS.fromIterable(['1']),
						),
					),
				);

				H.assertExitIsDie(exit);
			}),
		);
	});
});
