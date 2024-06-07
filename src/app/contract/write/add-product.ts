import type {
	reader as R,
	taskOption as TO,
} from 'fp-ts'

import type { ProductDTO } from '@/app/contract/read/types/product'

export type AddProduct = (
	product: ProductDTO,
) => TO.TaskOption<Error>

export type R_AddProduct<ENV> = (
	product: ProductDTO,
) => R.Reader<ENV, TO.TaskOption<Error>>
