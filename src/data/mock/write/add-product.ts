import {
	function as F,
	reader as R,
	taskOption as TO,
} from 'fp-ts'
import { delay } from 'fp-ts/lib/Task'

import type { AddProduct } from '@/app/interfaces/write/add-product'

type Deps = undefined

export const addProduct: R.Reader<
	Deps,
	AddProduct
> = F.flip(() => R.of(delay(650)(TO.none)))
