import type Dexie from 'dexie'
import {
	apply as APPLY,
	either as E,
	function as F,
	io as IO,
	ioEither as IOE,
	monoid as MO,
	number as N,
	option as OPT,
	ord as ORD,
	reader as R,
	readerIO as RIO,
	readerTask as RT,
	readerTaskEither as RTE,
	readonlyArray as RoA,
	string as S,
	task as T,
	taskEither as TE,
} from 'fp-ts'
import { PathReporter } from 'io-ts/PathReporter'

import { useOrCreateError } from '@/core/utils'

import {
	ProductDTO,
	type Products,
} from '@/app/interfaces/read/products'
import type { Log } from '@/app/interfaces/write/log'

import {
	type ProductRow,
	decodeProduct,
	fallbackProductCodec,
	productCodec,
} from '../codec'
import { PRODUCTS_TABLE } from '../schema'

const pipe = F.pipe
const flow = F.flow

interface Deps {
	db: Dexie
	log: Log
}

const fallbackDecode = (data: unknown) =>
	pipe(
		() => fallbackProductCodec.decode(data),
		IOE.chainW(flow(decodeProduct, IOE.right)),
	)

export const decodeData: (
	data: readonly unknown[],
) => RIO.ReaderIO<Log, readonly ProductRow[]> =
	flow(
		RIO.traverseArray(data =>
			pipe(
				productCodec.decode(data),
				RIO.of,
				RIO.chain(encoded =>
					pipe(
						encoded,
						IOE.fromEither,
						R.of,
						R.chain(
							F.flip((log: Log) =>
								IOE.matchEW(
									flow(
										E.left,
										PathReporter.report,
										IOE.of,
										IOE.tapIO(report =>
											log({
												message:
													report.join('.\n '),
												severity: 'warning',
											}),
										),
										IOE.apSecond(
											fallbackDecode(data),
										),
									),
									flow(decodeProduct, IOE.right),
								),
							),
						),
					),
				),
			),
		),
		RIO.tap(
			F.flip((log: Log) =>
				flow(
					RoA.filterMap(OPT.getLeft),
					RoA.map(
						flow(E.left, PathReporter.report),
					),
					RoA.map(array =>
						log({
							severity: 'error',
							message: array.join('\n. '),
						}),
					),
					IO.sequenceArray,
				),
			),
		),
		RIO.map(RoA.filterMap(OPT.getRight)),
	)

const decodeProductRow = (
	product: ProductRow,
): ProductDTO => ({
	id: product.id.toString(10),
	name: product.name,
	expirationDate: pipe(
		product.expiration_date,
		OPT.fromNullable,
	),
	creationDate: product.creation_date,
})

const logErrors = flow(
	(error: Error) => RTE.right(error),
	RTE.tapReaderIO(error =>
		R.asks(({ log }: Deps) =>
			log({
				message: error.message,
				severity: 'error',
			}),
		),
	),
	RTE.chainW(RTE.left),
)

const logResults = flow(
	(results: {
		total: number
		products: unknown[]
	}) => RTE.right(results),
	RTE.tapReaderIO(results =>
		R.asks(({ log }: Deps) =>
			log({
				message: `Received ${results.products.length.toString(10)} products out of ${results.total.toString(10)}`,
				severity: 'info',
			}),
		),
	),
	RTE.tapReaderIO(
		results => (deps: Deps) =>
			deps.log({
				message: `Products: ${JSON.stringify(
					results.products,
				)}`,
				severity: 'debug',
			}),
	),
)

const getTotalAndProducts = pipe(
	R.ask<Deps>(),
	R.map(({ db }) =>
		TE.tryCatch(
			pipe(() =>
				db.transaction(
					'r',
					db.table(PRODUCTS_TABLE.name),
					APPLY.sequenceS(T.ApplyPar)({
						total: () =>
							db
								.table(PRODUCTS_TABLE.name)
								.count(), // for future pagination
						products: () =>
							db
								.table(PRODUCTS_TABLE.name)
								.toArray(),
					}),
				),
			),
			useOrCreateError(
				'There was an error while getting the products and total',
			),
		),
	),
	RT.tap(
		flow(
			RTE.fromEither,
			RTE.matchEW(logErrors, logResults),
		),
	),
)

const M = ORD.getMonoid<ProductDTO>()

export const products: (deps: Deps) => Products =
	pipe(
		RTE.Do,
		RTE.bindW('results', () =>
			pipe(
				getTotalAndProducts,
				RTE.local((deps: Deps) => deps),
			),
		),
		RTE.bindW('items', ({ results }) =>
			pipe(
				decodeData(results.products),
				R.map(TE.fromIO),
				RTE.tapReaderIO(items =>
					pipe(
						R.ask<Log>(),
						R.map(log =>
							log({
								message: `Decoded items: ${JSON.stringify(
									items,
								)}`,
								severity: 'debug',
							}),
						),
					),
				),
				RTE.local((deps: Deps) => deps.log),
			),
		),
		RTE.map(({ items, results }) => ({
			items: pipe(
				items,
				RoA.map(decodeProductRow),
				RoA.sort(
					MO.concatAll(M)([
						pipe(
							N.Ord,
							ORD.reverse,
							OPT.getOrd,
							ORD.reverse,
							ORD.contramap(
								(product: ProductDTO) =>
									product.expirationDate,
							),
						),
						pipe(
							S.Ord,
							ORD.contramap(
								(product: ProductDTO) =>
									product.name,
							),
						),
					]),
				),
			),
			total: results.total,
		})),
		RTE.mapLeft(e => e.message),
	)
