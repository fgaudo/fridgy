import Dexie from 'dexie'

import { PRODUCTS_TABLE } from './schema'

export const createDB = (): Dexie => {
	const db = new Dexie('Fridgy')

	db.version(1).stores({
		[PRODUCTS_TABLE.name]: [
			`++${PRODUCTS_TABLE.columns.id}`,
			PRODUCTS_TABLE.columns.name,
			PRODUCTS_TABLE.columns.expirationDate,
			PRODUCTS_TABLE.columns.creationDate,
		].join(','),
	})

	return db
}
