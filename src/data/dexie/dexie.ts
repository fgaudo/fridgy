import type { EntityTable } from 'dexie'
import Dexie, { Entity } from 'dexie'
import { either as E } from 'fp-ts'

async function persistStorage() {
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
	return await navigator.storage?.persist?.()
}

export class Product extends Entity<FridgyDexie> {
	id!: number
	name!: string
	age!: number
}

export class FridgyDexie extends Dexie {
	products!: EntityTable<Product, 'id'>

	constructor() {
		super('FridgyDB')
		this.version(1).stores({
			products: '++id, name, expirationDate',
		})
		this.products.mapToClass(Product)
	}
}

export const createDB = async (): Promise<
	E.Either<string, FridgyDexie>
> => {
	if (!(await persistStorage())) {
		return E.left(
			'This app needs persistent storage to work',
		)
	}

	const db = new Dexie(
		'FridgyDatabase',
	) as FridgyDexie

	db.version(1).stores({
		products: '++id, name, expirationDate',
	})

	return E.right(db)
}
