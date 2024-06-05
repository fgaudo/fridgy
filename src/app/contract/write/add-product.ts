import type { Reader } from 'fp-ts/lib/Reader'
import type { TaskOption } from 'fp-ts/lib/TaskOption'

import type { ProductDTO } from '@/app/contract/read/types/product'

export type AddProduct = (
	product: ProductDTO,
) => TaskOption<Error>

export type R_AddProduct<ENV> = (
	product: ProductDTO,
) => Reader<ENV, TaskOption<Error>>
