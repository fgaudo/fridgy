import {
	function as F,
	option as OPT,
	readerTask as RT,
	readerTaskEither as RTE,
	taskEither as TE,
} from 'fp-ts'

import type { ProductDTO } from '@/app/interfaces/read/products'
import type { AddProduct as AddProductCommand } from '@/app/interfaces/write/add-product'

const pipe = F.pipe
const flow = F.flow

type Product = ProductDTO

interface Deps {
	addProduct: AddProductCommand
}

export type AddProduct = (
	p: Product,
) => TE.TaskEither<Error, void>

export const command: (deps: Deps) => AddProduct =
	F.flip(
		flow(
			RT.of,
			RT.bindTo('product'),
			RT.bind('timestamp', () =>
				RT.fromIO(() => new Date().getDate()),
			),
			RT.chain(({ product, timestamp }) =>
				pipe(
					product.expiration,
					OPT.match(
						() => (deps: Deps) =>
							deps.addProduct(product),
						expiration =>
							timestamp > expiration.date
								? RTE.left(
										new Error(
											'Date is in the past',
										),
									)
								: deps =>
										deps.addProduct(product),
					),
				),
			),
		),
	)
