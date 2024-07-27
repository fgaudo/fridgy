import {
	either as E,
	readerTaskEither as RTE,
	readonlyArray as RoA,
} from 'fp-ts'
import type { ReadonlyNonEmptyArray } from 'io-ts-types'

type ExecuteSql = (
	sql: string,
	values?: ReadonlyNonEmptyArray<unknown>,
) => RTE.ReaderTaskEither<
	SQLitePlugin.Database,
	Error,
	SQLitePlugin.Results
>

export const executeSql: ExecuteSql =
	(sql, values = undefined) =>
	db =>
	() =>
		new Promise(resolve => {
			try {
				db.executeSql(
					sql,
					values && RoA.toArray(values),
					results => {
						resolve(E.right(results))
					},
					error => {
						if (error instanceof Error) {
							resolve(E.left(error))
							return
						}

						resolve(
							E.left(
								new Error(
									'Query returned an error',
								),
							),
						)
					},
				)
			} catch {
				resolve(
					E.left(
						new Error(
							`Unexpected error ${sql} [${
								values?.join(',') ?? ''
							}]`,
						),
					),
				)
			}
		})

type InputTuple = readonly [
	sql: string,
	values?: ReadonlyNonEmptyArray<unknown>,
]

type InputToOutput<T extends InputTuple[]> = {
	[K in keyof T]: SQLitePlugin.Results
}

type ReadTransaction = <T extends InputTuple[]>(
	...params: [...T]
) => RTE.ReaderTaskEither<
	SQLitePlugin.Database,
	readonly [readonly Error[], Error],
	InputToOutput<T>
>

export const readTransaction: ReadTransaction =
	(...params) =>
	db =>
	() =>
		new Promise(resolve => {
			const results: SQLitePlugin.Results[] = []

			const errors: Error[] = []

			db.readTransaction(
				tx => {
					for (const [sql, values] of params) {
						tx.executeSql(
							sql,
							values && Array.from(values),
							(_tx, result) => {
								results.push(result)
							},
							(_tx, error) => {
								errors.push(error)
							},
						)
					}
				},
				error => {
					resolve(
						E.left([errors, error] as const),
					)
				},
				() => {
					resolve(
						E.right(
							results as InputToOutput<
								typeof params
							>,
						),
					)
				},
			)
		})
