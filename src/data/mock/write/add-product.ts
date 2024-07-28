import {
	function as F,
	reader as R,
	task as T,
	taskOption as TO,
} from 'fp-ts'

import type { AddProduct } from '@/app/interfaces/write/add-product'

type Deps = undefined

export const addProduct: R.Reader<
	Deps,
	AddProduct
> = F.flip(() => R.of(T.delay(650)(TO.none)))
