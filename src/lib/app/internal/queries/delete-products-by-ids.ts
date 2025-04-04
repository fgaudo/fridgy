import {
	C,
	Eff,
	NEHS,
} from '$lib/core/imports.ts';

export class Tag extends C.Tag(
	'DeleteProductsByIdsService',
)<
	Tag,
	(
		ids: NEHS.NonEmptyHashSet<string>,
	) => Eff.Effect<void, void>
>() {}
