import type { RequestResolver } from 'effect/RequestResolver'

import {
	C,
	Da,
	NEHS,
	R,
} from '$lib/core/imports.ts'

export class OperationFailed extends Da.TaggedError(
	'OperationFailed',
) {}

interface Request
	extends R.Request<void, OperationFailed> {
	readonly _tag: 'DeleteProductsByIds'
	readonly ids: NEHS.NonEmptyHashSet<string>
}

export const Request = R.tagged<Request>(
	'DeleteProductsByIds',
)

export class Resolver extends C.Tag(
	'app/operations/DeleteProductsByIdsResolver',
)<Resolver, RequestResolver<Request>>() {}
