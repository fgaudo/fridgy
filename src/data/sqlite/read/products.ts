import * as O from '@fgaudo/fp-ts-rxjs/Observable.js'
import * as RO from '@fgaudo/fp-ts-rxjs/ReaderObservable.js'
import {
	either as E,
	function as F,
	option as OPT,
	reader as R,
	readerTaskEither as RTE,
	readonlyArray as RoA,
} from 'fp-ts'
import {
	sequenceS,
	sequenceT,
} from 'fp-ts/lib/Apply'
import * as t from 'io-ts'
import { withFallback } from 'io-ts-types'
import * as Rx from 'rxjs'

import {
	type OnProducts,
	ProductEntityDTO,
} from '@/app/interfaces/read/on-products'

import * as H from '@/data/sqlite/helpers'
import { log } from '@/data/system/write/log'

const pipe = F.pipe

interface Deps {
	db: SQLitePlugin.Database
	events: Rx.Observable<void>
	prefix: string
}

export const productDecoder = t.readonly(
	t.type({
		id: t.bigint,
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
const decodeData = RoA.reduce<
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

const decodeTotal = (total: unknown) => {
	const decoded = t.number.decode(total)
	if (E.isLeft(decoded)) {
		log({ prefix: 'D' })({
			severity: 'error',
			message: `Could not parse the total amount of products`,
		})()
		return 0
	} else return decoded.right
}

export const products: (
	deps: Deps,
) => OnProducts = F.flip(
	F.flow(
		options => (deps: Deps) =>
			pipe(
				deps.events,
				Rx.map(() => ({
					options,
				})),
			),
		RO.switchMap(
			F.flow(
				vars =>
					pipe(
						H.readTransaction(
							[
								'SELECT * FROM products LIMIT ? OFFSET ? ORDER BY expDate',
								[30, vars.options.offset],
							],
							['SELECT count(*) FROM products'],
						),

						RTE.match(
							F.flow(
								errors =>
									[
										errors[0].map(
											error => error.message,
										),
										errors[1].message,
									] as const,
								errors =>
									E.left({
										...vars,
										error: new Error(
											`${errors[1]} # ${errors[0].join(' # ')}`,
										),
									}),
							),
							([products, total]) =>
								pipe(
									total.rows,
									E.fromPredicate(
										rows => rows.length === 1,
										rows => ({
											...vars,
											error: new Error(
												`total has ${rows.length.toString(10)} rows`,
											),
										}),
									),
									E.map(total => ({
										...vars,
										total: total.item(
											0,
										) as unknown,
										products: pipe(
											Array(
												products.rows.length,
											).keys(),
											Array.from<number>,
											RoA.fromArray,
											RoA.map(
												n =>
													products.rows.item(
														n,
													) as unknown,
											),
										),
									})),
								),
						),
					),
				RTE.local((deps: Deps) => deps.db),
				R.map(Rx.defer),
				RO.map(
					E.map(vars => ({
						items: decodeData(vars.products),
						offset: vars.options.offset,
						total: decodeTotal(vars.total),
					})),
				),
				RO.map(E.mapLeft(error => error.error)),
			),
		),
	),
)
