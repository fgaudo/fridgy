import { describe, layer } from '@effect/vitest';

import { Eff, L } from '$lib/core/imports.ts';
import * as H from '$lib/core/test-helpers.ts';

import { AddProduct } from '$lib/app/queries.ts';

import { Capacitor } from '$lib/data/index.ts';

import { command } from './add-product.ts';

describe('Add product', () => {
	layer(
		L.provide(
			command,
			L.succeed(Capacitor.Tag, {
				db: {
					addProduct: () => Promise.resolve(),
				} as unknown as Capacitor.FridgySqlitePlugin,
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
					const service = yield* AddProduct.Tag;

					const exit = yield* Eff.exit(
						service({
							maybeName: name,
							maybeExpirationDate: expirationDate,
							maybeCreationDate: creationDate,
						}),
					);

					H.assertExitIsSuccess(exit);
				}),
		);
	});

	layer(
		L.provide(
			command,
			L.succeed(Capacitor.Tag, {
				db: {
					addProduct: () =>
						Promise.reject(new Error()),
				} as unknown as Capacitor.FridgySqlitePlugin,
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
					const service = yield* AddProduct.Tag;

					const exit = yield* Eff.exit(
						service({
							maybeName: name,
							maybeExpirationDate: expirationDate,
							maybeCreationDate: creationDate,
						}),
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
					addProduct: () => {
						throw new Error();
					},
				} as unknown as Capacitor.FridgySqlitePlugin,
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
					const service = yield* AddProduct.Tag;

					const exit = yield* Eff.exit(
						service({
							maybeName: name,
							maybeExpirationDate: expirationDate,
							maybeCreationDate: creationDate,
						}),
					);

					H.assertExitIsDie(exit);
				}),
		);
	});
});
