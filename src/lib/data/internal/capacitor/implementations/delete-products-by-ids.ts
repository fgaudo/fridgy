import {
	Eff,
	H,
	L,
	N,
	O,
} from '$lib/core/imports.ts';

import { DeleteProductsByIds } from '$lib/app/queries.ts';

import { Capacitor } from '$lib/data/index.ts';

export const command = L.effect(
	DeleteProductsByIds.Tag,
	Eff.gen(function* () {
		const { db } = yield* Capacitor.Tag;

		return ids =>
			Eff.gen(function* () {
				const idsArray = yield* Eff.all(
					Array.from(ids).map(id =>
						Eff.gen(function* () {
							const parsed = N.parse(id);

							if (
								O.isSome(parsed) &&
								Number.isInteger(parsed.value)
							) {
								return parsed.value;
							}

							yield* H.logError(
								'Id has incorrect format',
							).pipe(Eff.annotateLogs({ id }));

							return yield* Eff.fail(undefined);
						}),
					),
				);

				yield* H.logDebug(
					`About to delete ${idsArray.length.toString(10)} products`,
				);

				yield* H.tryPromise(() =>
					db.deleteProductsByIds({
						ids: idsArray,
					}),
				);

				yield* H.logDebug(
					'No problems while deleting products',
				);
			});
	}),
);
