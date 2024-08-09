import {
	array as A,
	function as F,
	option as OPT,
	reader as R,
	readerTaskEither as RTE,
	readonlyArray as RoA,
	task as T,
} from 'fp-ts'

import {
	ProductDTO,
	type ProductsService,
} from '@/app/interfaces/read/products'

const pipe = F.pipe
const flow = F.flow

const productSamples = [
	'Milk',
	'Eggs',
	'Philadelphia',
	'Yogurt',
	'Broccoli',
]

type Deps = object

export const products: R.Reader<
	Deps,
	ProductsService
> = pipe(
	RTE.Do,
	R.tap(T.delay(1000)),
	RTE.bind('total', () => RTE.of(20)),
	RTE.bind('array', ({ total }) =>
		pipe(
			Array(total).keys(),
			Array.from<number>,
			A.map(BigInt),
			RoA.fromArray,
			RTE.of,
		),
	),
	RTE.bind(
		'items',
		flow(
			({ array }) => array,
			RoA.map(
				id =>
					({
						id: id.toString(10),

						name: productSamples[
							Math.floor(
								Math.random() *
									productSamples.length,
							)
						],
						creationDate: Date.now(),
						expirationDate: OPT.some(
							Date.now() +
								100000 +
								Math.floor(
									Math.random() * 26967228,
								),
						),
					}) satisfies ProductDTO,
			),
			RTE.of,
		),
	),
)
