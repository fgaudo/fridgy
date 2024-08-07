import {
	either as E,
	function as F,
	option as OPT,
	reader as R,
	readerTask as RT,
	readerTaskEither as RTE,
	taskEither as TE,
} from 'fp-ts'
import * as t from 'io-ts'
import { withFallback } from 'io-ts-types'
import { PathReporter } from 'io-ts/PathReporter'

import type {
	ProductDTO,
	Products,
} from '@/app/interfaces/read/products'
import type {
	Log,
	LogSeverity,
} from '@/app/interfaces/write/log'

import type { FridgySqlitePlugin } from '../fridgy-sqlite-plugin'

interface Deps {
	db: FridgySqlitePlugin
	log: Log
}

const pipe = F.pipe
const flow = F.flow

const PRODUCT_ID = 'id'
const PRODUCT_NAME = 'name'
const PRODUCT_EXPIRATION_DATE = 'expirationDate'
const PRODUCT_CREATION_DATE = 'creationDate'

const defaultValues = {
	[PRODUCT_ID]: -1,
	[PRODUCT_NAME]: '[UNDEFINED]',
	[PRODUCT_CREATION_DATE]: 0,
}

export const productCodec = t.type({
	products: t.array(
		t.intersection([
			t.type({
				[PRODUCT_ID]: t.number,
				[PRODUCT_NAME]: t.string,
				[PRODUCT_CREATION_DATE]: t.number,
			}),
			t.partial({
				[PRODUCT_EXPIRATION_DATE]: t.number,
			}),
		]),
	),
	total: t.number,
})

export const fallbackProductCodec = withFallback(
	t.partial({
		products: withFallback(
			t.array(
				withFallback(
					t.partial({
						[PRODUCT_ID]: withFallback(
							t.number,
							defaultValues[PRODUCT_ID],
						),
						[PRODUCT_NAME]: withFallback(
							t.string,
							defaultValues[PRODUCT_NAME],
						),
						[PRODUCT_CREATION_DATE]: withFallback(
							t.number,
							defaultValues[
								PRODUCT_CREATION_DATE
							],
						),

						[PRODUCT_EXPIRATION_DATE]:
							withFallback(
								t.union([t.number, t.undefined]),
								undefined,
							),
					}),
					{
						[PRODUCT_ID]:
							defaultValues[PRODUCT_ID],
						[PRODUCT_NAME]:
							defaultValues[PRODUCT_NAME],
						[PRODUCT_CREATION_DATE]:
							defaultValues[
								PRODUCT_CREATION_DATE
							],
					},
				),
			),
			[],
		),
		total: withFallback(t.number, 0),
	}),
	{
		products: [],
		total: 0,
	},
)

type FallbackProducts = t.TypeOf<
	typeof fallbackProductCodec
>

type FallbackProductRaw = t.TypeOf<
	typeof fallbackProductCodec.props.products.type
>

const log =
	(data: {
		severity: LogSeverity
		message: string
	}) =>
	(deps: Deps) =>
		deps.log(data)

export const decodeProduct = (
	row: FallbackProductRaw,
): ProductDTO => ({
	creationDate:
		row.creationDate ??
		defaultValues[PRODUCT_CREATION_DATE],
	expirationDate: OPT.fromNullable(
		row.expirationDate,
	),
	name: row.name ?? defaultValues[PRODUCT_NAME],
	id: (
		row.id ?? defaultValues[PRODUCT_ID]
	).toString(10),
})

export const decodeProducts = (
	row: FallbackProducts,
): {
	items: readonly ProductDTO[]
	total: number
} => ({
	items: row.products?.map(decodeProduct) ?? [],
	total: row.total ?? 0,
})

export const decodeData: (
	data: unknown,
) => RTE.ReaderTaskEither<
	Deps,
	string,
	{
		items: readonly ProductDTO[]
		total: number
	}
> = flow(
	RT.of,
	RT.bindTo('data'),
	RT.bind('result', ({ data }) =>
		pipe(productCodec.decode(data), RT.of),
	),
	R.map(TE.fromTask),
	RTE.bind('decoded', ({ result, data }) =>
		pipe(
			result,
			RTE.fromEither,
			RTE.matchE(
				flow(
					E.left,
					PathReporter.report,
					RT.of,
					RT.chain(messages =>
						pipe(
							log({
								severity: 'warning',
								message: messages.join(', '),
							}),
							RT.fromReaderIO,
						),
					),
					RT.chainW(() =>
						pipe(
							fallbackProductCodec.decode(data),
							RTE.fromEither,
						),
					),
					RTE.map(decodeProducts),
				),

				flow(decodeProducts, RTE.right),
			),
		),
	),
	RTE.matchE(
		flow(
			E.left,
			PathReporter.report,
			RT.of,
			RT.chain(messages =>
				pipe(
					log({
						severity: 'error',
						message: messages.join(', '),
					}),
					RT.fromReaderIO,
				),
			),

			RT.map(() =>
				E.left('Some products are corrupt'),
			),
		),
		({ decoded }) => RTE.right(decoded),
	),
)

export const products: R.Reader<Deps, Products> =
	pipe(
		R.asks((deps: Deps) =>
			deps.db.getAllProductsWithTotal(),
		),
		R.flatMap(decodeData),
	)
