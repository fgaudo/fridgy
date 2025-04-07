import {
	Eff,
	H,
	L,
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
				const idsArray = yield* Eff.allSuccesses(
					Array.from(ids).map(id =>
						Eff.gen(function* () {
							const parsed = yield* Eff.option(
								Eff.try(() => JSON.parse(id)),
							);

							if (O.isSome(parsed)) {
								return parsed.value;
							}

							yield* H.logWarning(
								'Id has incorrect format. Skipping.',
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
