import {
	function as F,
	option as OPT,
	readerTask as RT,
	readerTaskEither as RTE,
	taskEither as TE,
} from 'fp-ts'

import type { AddProduct as AddProductCommand } from '@/app/interfaces/write/add-product'

const pipe = F.pipe
const flow = F.flow

export interface ProductDTO {
	name: string
	expiration: OPT.Option<{
		date: number
		isBestBefore: boolean
	}>
}

interface Deps {
	addProduct: AddProductCommand
}

export type AddProduct = (
	p: ProductDTO,
) => TE.TaskEither<Error, void>

export const command: (deps: Deps) => AddProduct =
	F.flip(
		flow(
			RT.of,
			RT.bindTo('product'),
			RT.bind('timestamp', () =>
				RT.fromIO(() => Date.now()),
			),
			RT.chain(({ product, timestamp }) =>
				pipe(
					product.expiration,
					OPT.match(
						() => (deps: Deps) =>
							deps.addProduct({
								...product,
								creationDate: timestamp,
							}),
						expiration =>
							timestamp > expiration.date
								? RTE.left(
										new Error(
											'Date is in the past',
										),
									)
								: deps =>
										deps.addProduct({
											...product,
											creationDate: timestamp,
										}),
					),
				),
			),
		),
	)
