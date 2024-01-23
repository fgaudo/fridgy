import * as RoA from 'fp-ts/ReadonlyArray'
import * as RoS from 'fp-ts/ReadonlySet'
import { fromEquals } from 'fp-ts/lib/Eq'
import { pipe } from 'fp-ts/lib/function'
import * as Rx from 'rxjs'

import type { R_OnProducts } from '@/app/contract/read/on-products'
import { productDataEquals } from '@/app/contract/read/types/product'

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
				fromEquals(productDataEquals<string>),
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
