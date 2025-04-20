import {
	Eff,
	H,
	L,
	O,
} from '$lib/core/imports.ts';

import { DeleteProductsByIds } from '$lib/business/app/queries.ts';

import { DbPlugin } from '../db-plugin.ts';

export const command = L.effect(
	DeleteProductsByIds.Tag,
	Eff.gen(function* () {
		const { db } = yield* DbPlugin;

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

							yield* Eff.logWarning(
								'Id has incorrect format. Skipping.',
							).pipe(Eff.annotateLogs({ id }));

							return yield* Eff.fail(undefined);
						}),
					),
				);

				yield* Eff.logDebug(
					`About to delete ${idsArray.length.toString(10)} products`,
				);

				yield* H.tryPromise(() =>
					db.deleteProductsByIds({
						ids: idsArray,
					}),
				).pipe(
					Eff.catchTags({
						UnknownException: ({ message }) =>
							new DeleteProductsByIds.OperationFailed(
								{ message },
							),
					}),
				);

				yield* Eff.logDebug(
					'No problems while deleting products',
				);
			});
	}),
);
