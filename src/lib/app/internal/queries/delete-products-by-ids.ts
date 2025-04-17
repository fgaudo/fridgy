import { Data } from 'effect';

import {
	C,
	Eff,
	NEHS,
} from '$lib/core/imports.ts';

export class Infrastructure extends Data.TaggedError(
	'Infrastructure',
)<{ message: string }> {}

export class Tag extends C.Tag(
	'DeleteProductsByIdsService',
)<
	Tag,
	(
		ids: NEHS.NonEmptyHashSet<string>,
	) => Eff.Effect<void, Infrastructure>
>() {}
