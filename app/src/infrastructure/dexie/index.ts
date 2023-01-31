import { Dexie } from 'dexie'

import { Food } from '@/domain/food'

export class FridgyDatabase extends Dexie {
	foods!: Dexie.Table<Food, string>

	constructor() {
		super('FridgyDatabase')

		this.version(1).stores({
			foods: 'id'
		})
	}
}
