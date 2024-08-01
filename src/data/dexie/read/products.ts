import * as Match from '@effect/match'
import type Dexie from 'dexie'
import {
	apply as APPLY,
	either as E,
	function as F,
	io as IO,
	ioEither as IOE,
	option as OPT,
	reader as R,
	readerIO as RIO,
	readerTask as RT,
	readerTaskEither as RTE,
	readonlyArray as RoA,
	task as T,
	taskEither as TE,
} from 'fp-ts'
import type { Errors } from 'io-ts'
import { failure } from 'io-ts/PathReporter'

import {
	type Options,
	ProductDTO,
	type Products,
} from '@/app/interfaces/read/products'
import type { Log } from '@/app/interfaces/write/log'

import { productCodec } from '../codec'
import { PRODUCTS_TABLE } from '../schema'

const pipe = F.pipe
const flow = F.flow

interface Deps {
	db: Dexie
	log: Log
}

export const decodeData: (
	data: readonly unknown[],
) => RIO.ReaderIO<
	Log,
	readonly E.Either<Errors, ProductDTO>[]
> = RIO.traverseArray(
	flow(
		data => productCodec.decode(data),
		RIO.of,
		RIO.bindTo('result'),
		RIO.bind('log', () => RIO.ask<Log>()),
		RIO.chainIOK(({ result, log }) =>
			pipe(
				result,
				IOE.fromEither,
				IOE.matchEW(
					flow(
						IOE.right,
						IOE.tapIO(errors =>
							log({
								severity: 'error',
								message:
									failure(errors).join('\n'),
							}),
						),
						IOE.chain(IOE.left),
					),
					flow(
						IO.of,
						IO.bindTo('product'),
						IO.bind('messages', ({ product }) =>
							pipe(
								[
									pipe(
										product.name,
										OPT.fromPredicate(
											value =>
												value === undefined,
										),
										OPT.map(
											() => 'name is undefined',
										),
									),
									pipe(
										product.expiration,
										OPT.fromPredicate(
											value =>
												value === undefined,
										),
										OPT.map(
											() =>
												'expiration is undefined',
										),
									),
									pipe(
										product.creation_date,
										OPT.fromPredicate(
											value =>
												value === undefined,
										),
										OPT.map(
											() =>
												'creation_date is undefined',
										),
									),
								],
								OPT.sequenceArray,
								IO.of,
							),
						),
						IO.tap(vars =>
							pipe(
								vars.messages,
								OPT.match(
									() => IO.of(undefined),
									messages =>
										log({
											message: `Product ${messages.join(', ')}`,
											severity: 'warning',
										}),
								),
							),
						),
						IO.map(
							({ product }) =>
								({
									id: product.id.toString(10),
									name:
										product.name ?? '[UNDEFINED]',
									expiration: pipe(
										OPT.fromNullable(
											product.expiration,
										),
										OPT.map(expiration => ({
											isBestBefore:
												expiration.is_best_before,
											date: expiration.date,
										})),
									),
								}) satisfies ProductDTO,
						),
						IOE.fromIO,
					),
				),
			),
		),
	),
)

export const products: (deps: Deps) => Products =
	F.flip(
		F.flow(
			RTE.of,
			RTE.bindTo('options'),
			RTE.bind('db', () =>
				RTE.asks((deps: Deps) => deps.db),
			),
			RTE.bindW('results', ({ options, db }) =>
				pipe(
					TE.tryCatch(
						() =>
							db.transaction(
								'r',
								db.table(PRODUCTS_TABLE.name),
								APPLY.sequenceS(T.ApplyPar)({
									total: getTotal(db),
									products:
										getProducts(options)(db),
								}),
							),
						error =>
							error instanceof Error
								? error
								: new Error(
										'Transaction failed while getting product list',
									),
					),
					RTE.fromTaskEither,
				),
			),
			RTE.bindW('items', ({ results }) =>
				pipe(
					decodeData(results.products),
					RIO.local((deps: Deps) => deps.log),
					R.map(TE.fromIO),
					RTE.map(RoA.filterMap(OPT.getRight)),
				),
			),
			RTE.map(({ items, results }) => ({
				items,
				total: results.total,
			})),
		),
	)

const getTotal: RT.ReaderTask<Dexie, number> =
	db => () =>
		db.table(PRODUCTS_TABLE.name).count()

const getProducts: (
	options: Options,
) => RT.ReaderTask<Dexie, unknown[]> =
	(options: Options) => (db: Dexie) => () =>
		db
			.table(PRODUCTS_TABLE.name)
			.offset(options.offset)
			.sortBy(
				pipe(
					Match.value(options.sortBy),
					Match.when(
						'a-z',
						() => PRODUCTS_TABLE.columns.name,
					),
					Match.when(
						'creationDate',
						() =>
							PRODUCTS_TABLE.columns.creationDate,
					),
					Match.when(
						'expirationDate',
						() =>
							`${
								PRODUCTS_TABLE.columns.expiration
									.name
							}.${
								PRODUCTS_TABLE.columns.expiration
									.value.date
							}`,
					),
					Match.exhaustive,
				),
			)
