import type { taskOption as TO } from 'fp-ts'

import type { ProductDTO } from '@/app/interfaces/read/types/product'

export type AddProduct = (
	product: ProductDTO,
) => TO.TaskOption<Error>
