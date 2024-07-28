import {
	array as A,
	either as E,
	function as F,
	option as OPT,
	reader as R,
	readerTask as RT,
	readerTaskEither as RTE,
	readonlyArray as RoA,
	task as T,
	taskEither as TE,
} from 'fp-ts'

import { type Products } from '@/app/interfaces/read/products'

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

export const products: R.Reader<Deps, Products> =
	F.flip(
		flow(
			RTE.of,
			RTE.bindTo('options'),
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
								product: {
									name: productSamples[
										Math.floor(
											Math.random() *
												productSamples.length,
										)
									],
									expDate: OPT.some({
										isBestBefore: false,
										timestamp:
											new Date().getDate() +
											100000 +
											Math.floor(
												Math.random() * 26967228,
											),
									}),
								},
							}) as const,
					),
					RTE.of,
				),
			),
		),
	)
