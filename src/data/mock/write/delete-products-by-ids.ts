import {
	task as T,
	taskOption as TO,
} from 'fp-ts'

import type { DeleteProductsByIds } from '@/app/interfaces/write/delete-products-by-ids'

type Deps = object

export const deleteProductByIds: (
	deps: Deps,
) => DeleteProductsByIds = () => () =>
	T.delay(250)(TO.none)
