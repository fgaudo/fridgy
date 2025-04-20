import { Data } from 'effect';

import {
	C,
	Eff,
	NEHS,
} from '$lib/core/imports.ts';

export class OperationFailed extends Data.TaggedError(
	'OperationFailed',
)<{ message: string }> {}

export class Tag extends C.Tag(
	'data/DeleteProductsByIds',
)<
	Tag,
	(
		ids: NEHS.NonEmptyHashSet<string>,
	) => Eff.Effect<void, OperationFailed>
>() {}
