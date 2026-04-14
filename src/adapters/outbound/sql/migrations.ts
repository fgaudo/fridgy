import * as Effect from 'effect/Effect'
import * as SqlClient from 'effect/unstable/sql/SqlClient'

import * as DB from './sql-db.ts'

export const migrations = {
	'0000001_create_db': Effect.gen(function* () {
		const sql = yield* SqlClient.SqlClient
		yield* sql.withTransaction(
			Effect.gen(function* () {
				const product = DB.ProductSchema
				const expiration = DB.ProductExpirationSchema
				yield* sql`
					CREATE TABLE ${sql(product.table)}(
						${sql(product.columns.id)} INT PRIMARY KEY,
						${sql(product.columns.name)} VARCHAR(255) NOT NULL,
						${sql(product.columns.creationDate)} INT NOT NULL
					);
					CREATE TABLE ${sql(expiration.table)}(
						${sql(expiration.columns.id)} INT PRIMARY KEY,
						${sql(expiration.columns.date)} INT NOT NULL,
						${sql(expiration.columns.productId)} INT NOT NULL,
						FOREIGN KEY(${sql(expiration.columns.productId)})
                REFERENCES ${sql(product.table)}(${sql(product.columns.id)})
                ON DELETE CASCADE
					);
				`
			}),
		)
	}),
}
