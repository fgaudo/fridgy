import {
	function as F,
	option as OPT,
	readerTask as RT,
	readerTaskEither as RTE,
	task as T,
	taskEither as TE,
} from 'fp-ts'

import type { ProductDTO } from '@/app/interfaces/read/types/product'
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
			RT.of<Deps, Product>,
			RT.bindTo('product'),
			RT.bind('timestamp', () =>
				RT.fromIO(() => new Date().getDate()),
			),
			RT.chain(({ product, timestamp }) =>
				pipe(
					product.expDate,
					OPT.match(
						() => (deps: Deps) =>
							deps.addProduct(product),
						date =>
							timestamp > date.timestamp
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
