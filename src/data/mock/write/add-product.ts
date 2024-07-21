import {
	reader as R,
	taskOption as TO,
} from 'fp-ts'

import type { R_AddProduct } from '@/app/contract/write/add-product'

type Deps = undefined

export const addProduct: R_AddProduct<
	Deps
> = () => R.of(TO.none)
