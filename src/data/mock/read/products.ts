import {
	function as F,
	option as OPT,
	reader as R,
	readonlyArray as RoA,
} from 'fp-ts'
import * as Rx from 'rxjs'

import * as B from '@/core/base64'

import { type OnProducts } from '@/app/interfaces/read/on-products'

const pipe = F.pipe

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
	OnProducts
> = F.flip(
	() => () =>
		pipe(
			Rx.timer(1000),
			Rx.map(() => ({
				offset: 0,
				total: 20,
				items: pipe(
					Array(20).keys(),
					Array.from<number>,
					RoA.fromArray,
					RoA.map(
						id =>
							({
								id: B.encodeText(id.toString(10)),
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
				),
			})),
		),
)
