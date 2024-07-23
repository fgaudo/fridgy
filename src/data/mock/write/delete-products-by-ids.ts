import { taskOption as TO } from 'fp-ts'

import type { DeleteProductsByIds } from '@/app/contract/write/delete-products-by-ids'

type Deps = object

export const deleteProductByIds: (
	deps: Deps,
) => DeleteProductsByIds = () => () => TO.none
