import * as D from 'fp-ts/Date'

export interface Food {
  readonly id: string
  readonly name: string
  readonly expDate: Date
}

export const expirationStatus = (date: Date) => (food: Food): 'ok' | 'expired' | 'check' =>
  D.Ord.compare(food.expDate, date) < 0 ? 'expired' : 'ok'
