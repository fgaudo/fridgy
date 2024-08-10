import { Context } from 'effect'
import type { Effect } from 'effect/Effect'
import type { HashSet } from 'effect/HashSet'

import { B } from '@/core/imports'

export class DeleteProductsByIdsService extends Context.Tag(
	'DeleteProductsByIdsService',
)<
	DeleteProductsByIdsService,
	(
		ids: HashSet<string>,
	) => Effect<
		void,
		DeleteProductsByIdsServiceError
	>
>() {}

export type DeleteProductsByIdsServiceError =
	string &
		B.Brand<'DeleteProductsByIdsServiceError'>

export const DeleteProductsByIdsServiceError =
	B.nominal<DeleteProductsByIdsServiceError>()
