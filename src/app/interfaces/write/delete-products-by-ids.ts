import { Context } from 'effect'
import type { Effect } from 'effect/Effect'
import type { HashSet } from 'effect/HashSet'

export class DeleteProductsByIdsService extends Context.Tag(
	'DeleteProductsByIdsService',
)<
	DeleteProductsByIdsService,
	(ids: HashSet<string>) => Effect<void, string>
>() {}
