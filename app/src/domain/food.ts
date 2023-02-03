import * as D from 'fp-ts/Date'
import * as Ord from 'fp-ts/Ord'
import { Eq } from 'fp-ts/lib/Eq'
import * as S from 'fp-ts/string'

type FoodId = string
export const FoodIdEq: Eq<FoodId> = S.Eq
export const FoodIdOrd: Ord.Ord<FoodId> = Ord.trivial

export interface Food {
	readonly id: FoodId
	readonly name: string
	readonly expDate: Date
}

export const expirationStatus =
	(date: Date) =>
	(food: Food): 'ok' | 'expired' | 'check' =>
		D.Ord.compare(food.expDate, date) < 0 ? 'expired' : 'ok'
