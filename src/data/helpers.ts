import * as E from 'fp-ts/Either'
import * as RTE from 'fp-ts/ReaderTaskEither'
import * as RoA from 'fp-ts/ReadonlyArray'
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
					values === undefined
						? undefined
						: RoA.toArray(values),
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
							`Unexpected error ${sql} [${values?.join(
								',',
							)}]`,
						),
					),
				)
			}
		})
