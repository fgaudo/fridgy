import {
	function as F,
	reader as R,
	taskOption as TO,
} from 'fp-ts'

import type { AddProduct } from '@/app/contract/write/add-product'

type Deps = undefined

export const addProduct: R.Reader<
	Deps,
	AddProduct
> = F.flip(product => R.of(TO.none))
