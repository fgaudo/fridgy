import {
	eq as Eq,
	function as F,
	readonlyArray as RoA,
	readonlySet as RoS,
} from 'fp-ts'
import * as Rx from 'rxjs'

import type { R_OnProducts } from '@/app/contract/read/on-products'
import { productDataEquals } from '@/app/contract/read/types/product'

const pipe = F.pipe

const productSamples = [
	'Milk',
	'Eggs',
	'Philadelphia',
	'Yogurt',
	'Broccoli',
]

interface Deps {}

export const products: R_OnProducts<
	Deps,
	string
> = () =>
	pipe(
		Rx.timer(2000),
		Rx.map(() =>
			RoS.fromReadonlyArray(
				Eq.fromEquals(productDataEquals<string>),
			)(
				pipe(
					Array(20).keys(),
					Array.from<number>,
					RoA.fromArray,
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
								expDate:
									new Date().getDate() +
									100000 +
									Math.floor(
										Math.random() * 26967228,
									),
							}) as const,
					),
				),
			),
		),
	)
