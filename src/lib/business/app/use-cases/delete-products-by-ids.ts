import {
	A,
	Eff,
	NEHS,
} from '$lib/core/imports.ts';
import {
	type Value,
	asValue,
} from '$lib/core/utils.ts';

import { DeleteProductsByIds } from '$lib/business/app/queries';

export class Service extends Eff.Service<Service>()(
	'app/DeleteProductsByIds',
	{
		effect: Eff.gen(function* () {
			const deleteProductsByIds =
				yield* DeleteProductsByIds.Tag;

			return (
				ids: Value<NEHS.NonEmptyHashSet<string>>,
			) =>
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
	},
) {}
