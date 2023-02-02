import * as D from 'fp-ts/Date'
import * as S from 'fp-ts/string'

export const FoodIdEq = S.Eq
export const FoodIdOrd = S.Ord
type FoodId = string

export interface Food {
	readonly id: FoodId
	readonly name: string
	readonly expDate: Date
}

export const expirationStatus =
	(date: Date) =>
	(food: Food): 'ok' | 'expired' | 'check' =>
		D.Ord.compare(food.expDate, date) < 0 ? 'expired' : 'ok'
