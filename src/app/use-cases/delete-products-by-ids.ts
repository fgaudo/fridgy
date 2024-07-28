import {
	function as F,
	option as OPT,
	task as T,
} from 'fp-ts'

import type { ReadonlyNonEmptySet } from '@/core/readonly-non-empty-set'

import type { DeleteProductsByIds as DeleteProductsByIdsCommand } from '@/app/interfaces/write/delete-products-by-ids'

const flow = F.flow

interface Deps {
	deleteProductsByIds: DeleteProductsByIdsCommand
}

export type DeleteProductsByIds = (
	ids: ReadonlyNonEmptySet<string>,
) => T.Task<OPT.Option<Error>>

export const command: (
	deps: Deps,
) => DeleteProductsByIds = flow(
	deps => deps.deleteProductsByIds,
)
