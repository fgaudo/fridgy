import {
	either as E,
	function as F,
	option as OPT,
	readonlyArray as RoA,
} from 'fp-ts'
import * as t from 'io-ts'
import { withFallback } from 'io-ts-types'

import { ProductEntityDTO } from '@/app/interfaces/read/products'

import { log } from '@/data/system/write/log'

const pipe = F.pipe

export const productDecoder = t.readonly(
	t.type({
		id: t.number,
		name: withFallback(
			t.union([t.string, t.undefined]),
			undefined,
		),
		expDate: withFallback(
			t.union([
				t.readonly(
					t.type({
						isBestBefore: t.boolean,
						timestamp: t.number,
					}),
				),

				t.undefined,
			]),
			undefined,
		),
	}),
)
export const decodeData = RoA.reduce<
	unknown,
	readonly ProductEntityDTO[]
>(RoA.empty, (productDTOs, row) => {
	const productRowEither =
		productDecoder.decode(row)

	if (E.isLeft(productRowEither)) {
		log({ prefix: 'D' })({
			severity: 'error',
			message: 'Row could not be parsed',
		})()

		return productDTOs
	}

	const productRow = productRowEither.right

	if (productRow.name === undefined) {
		log({ prefix: 'D' })({
			severity: 'error',
			message: `Could not parse name of row ${productRow.id.toString(10)}`,
		})()
	}

	const productData = {
		id: productRow.id.toString(10),
		product: {
			name: productRow.name ?? '[undefined]',
			expDate: OPT.fromNullable(
				productRow.expDate,
			),
		},
	}

	return pipe(
		productDTOs,
		RoA.append(productData),
	)
})

export const decodeTotal = (total: unknown) => {
	const decoded = t.number.decode(total)
	if (E.isLeft(decoded)) {
		log({ prefix: 'D' })({
			severity: 'error',
			message: `Could not parse the total amount of products`,
		})()
		return 0
	} else return decoded.right
}
