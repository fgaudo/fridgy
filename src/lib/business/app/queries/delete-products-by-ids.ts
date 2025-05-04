import { Data } from 'effect'

import {
	C,
	Eff,
	NEHS,
} from '$lib/core/imports.ts'

export class OperationFailed extends Data.TaggedError(
	'OperationFailed',
) {}

export class DeleteProductsByIds extends C.Tag(
	'data/DeleteProductsByIds',
)<
	DeleteProductsByIds,
	(
		ids: NEHS.NonEmptyHashSet<string>,
	) => Eff.Effect<void, OperationFailed>
>() {}
