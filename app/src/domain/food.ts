import * as D from 'fp-ts/Date'

export interface Food {
  readonly id: string
  readonly name: string
  readonly expDate: Date
}

export const isExpired = (date: Date) => (food: Food): boolean =>
  D.Ord.compare(food.expDate, date) < 0
