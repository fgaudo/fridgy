import * as RO from '@fgaudo/fp-ts-rxjs/ReaderObservable.js'
import {
	function as F,
	option as OPT,
	readerTask as RT,
	task as T,
} from 'fp-ts'

import type { ProductDTO } from '@/app/contract/read/types/product'
import type { AddProduct as AddProductCommand } from '@/app/contract/write/add-product'

const pipe = F.pipe
const flow = F.flow

type Product = ProductDTO

interface Deps {
	addProduct: AddProductCommand
}

export type AddProduct = (
	p: Product,
) => T.Task<OPT.Option<Error>>

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
								? RT.of(
										OPT.of(
											new Error(
												'Date is in the past',
											),
										),
									)
								: deps =>
										deps.addProduct(product),
					),
				),
			),
		),
	)
