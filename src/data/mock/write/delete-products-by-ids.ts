import { taskOption as TO } from 'fp-ts'
import { delay } from 'fp-ts/lib/Task'

import type { DeleteProductsByIds } from '@/app/contract/write/delete-products-by-ids'

type Deps = object

export const deleteProductByIds: (
	deps: Deps,
) => DeleteProductsByIds = () => () =>
	delay(250)(TO.none)
