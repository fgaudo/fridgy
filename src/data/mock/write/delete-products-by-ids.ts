import {
	task as T,
	taskEither as TE,
} from 'fp-ts'

import type { DeleteProductsByIdsService } from '@/app/interfaces/write/delete-products-by-ids'

type Deps = object

export const deleteProductByIds: (
	deps: Deps,
) => DeleteProductsByIdsService = () => () =>
	T.delay(250)(TE.right(undefined))
