import type { taskEither as TE } from 'fp-ts'

import type { ProductDTO } from '@/app/interfaces/read/types/product'

export type AddProduct = (
	product: ProductDTO,
) => TE.TaskEither<Error, void>
