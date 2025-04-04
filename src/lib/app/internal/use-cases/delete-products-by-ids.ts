import {
	A,
	C,
	Eff,
	H,
	L,
	NEHS,
} from '$lib/core/imports.ts';

import { DeleteProductsByIds } from '$lib/app/queries.ts';

export class Tag extends C.Tag(
	'DeleteProductsByIdsUseCase',
)<
	Tag,
	(
		ids: NEHS.NonEmptyHashSet<string>,
	) => Eff.Effect<void, void>
>() {}

export const useCase = L.effect(
	Tag,
	Eff.gen(function* () {
		const deleteProductsByIds =
			yield* DeleteProductsByIds.Tag;

		return ids =>
			Eff.gen(function* () {
				H.logDebug(
					'Delete products use-case started',
				);

				yield* deleteProductsByIds(ids);

				yield* H.logInfo('Products deleted').pipe(
					Eff.annotateLogs(
						'ids',
						A.fromIterable(ids),
					),
				);
			});
	}),
);
