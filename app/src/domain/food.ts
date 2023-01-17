import * as D from 'fp-ts/Date'

export interface Food {
  readonly id: string
  readonly name: string
  readonly expDate: Date
}

export const isExpired = (food: Food) => (now: Date): boolean =>
  D.Ord.compare(food.expDate, now) < 0
