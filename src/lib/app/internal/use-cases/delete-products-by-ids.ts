import {
	A,
	C,
	Eff,
	L,
	NEHS,
} from '$lib/core/imports.ts';
import {
	type Value,
	asValue,
} from '$lib/core/utils.ts';

import { DeleteProductsByIds } from '$lib/app/queries.ts';

export class Tag extends C.Tag(
	'DeleteProductsByIdsUseCase',
)<
	Tag,
	(
		ids: Value<NEHS.NonEmptyHashSet<string>>,
	) => Eff.Effect<void, void>
>() {}

export const useCase = L.effect(
	Tag,
	Eff.gen(function* () {
		const deleteProductsByIds =
			yield* DeleteProductsByIds.Tag;

		return ids =>
			Eff.gen(function* () {
				Eff.logDebug(
					'Delete products use-case started',
				);

				const idsValue = asValue(ids);

				yield* deleteProductsByIds(idsValue);

				yield* Eff.logInfo(
					'Products deleted',
				).pipe(
					Eff.annotateLogs(
						'ids',
						A.fromIterable(idsValue),
					),
				);
			});
	}),
);
