import * as Effect from 'effect/Effect'
import * as SqlClient from 'effect/unstable/sql/SqlClient'

import * as DB from './sql-db.ts'

export const migrations = {
	'0000001_create_db': Effect.gen(function* () {
		const sql = yield* SqlClient.SqlClient
		yield* sql.withTransaction(
			Effect.gen(function* () {
				const product = DB.DbSchema.product
				const productExpiration = DB.DbSchema.productExpiration
				yield* sql`
					CREATE TABLE ${product.table}(
						${product.columns.id} INT PRIMARY KEY,
						${product.columns.name} VARCHAR(255) NOT NULL,
						${product.columns.creationDate} INT NOT NULL
					)
					CREATE TABLE ${DB.DbSchema.productExpiration.table}(
						${productExpiration.columns.id} INT PRIMARY KEY,
						${productExpiration.columns.date} INT NOT NULL,
						FOREIGN KEY(${productExpiration.columns.productId})
                REFERENCES ${product.columns.id})
                ON DELETE CASCADE
					)
				`
			}),
		)
	}),
}
