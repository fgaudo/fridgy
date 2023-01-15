import { Food } from '@/domain/food'
import { Dexie } from 'dexie'

export class FridgyDatabase extends Dexie {
  foods!: Dexie.Table<Food, string>

  constructor () {
    super('FridgyDatabase')

    this.version(1).stores({
      foods: 'id'
    })
  }
}
