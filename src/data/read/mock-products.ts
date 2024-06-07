import {
	function as F,
	readonlyArray as RoA,
	readonlySet as RoS,
} from 'fp-ts'
import * as Rx from 'rxjs'

import * as B from '@/core/base64'

import {
	ProductEntityDTO,
	type R_OnProducts,
} from '@/app/contract/read/on-products'

const pipe = F.pipe

const productSamples = [
	'Milk',
	'Eggs',
	'Philadelphia',
	'Yogurt',
	'Broccoli',
]

interface Deps {}

export const products: R_OnProducts<Deps> = () =>
	pipe(
		Rx.timer(2000),
		Rx.map(() =>
			RoS.fromReadonlyArray(ProductEntityDTO.Eq)(
				pipe(
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
									expDate: {
										isBestBefore: false,
										timestamp:
											new Date().getDate() +
											100000 +
											Math.floor(
												Math.random() * 26967228,
											),
									},
								},
							}) as const,
					),
				),
			),
		),
	)
