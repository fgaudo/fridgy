import { Either, right } from 'fp-ts/lib/Either'
import * as N from 'fp-ts/number'
import { Newtype, iso } from 'newtype-ts'

type FoodId = string
export interface FoodData {
	readonly id: FoodId
	readonly name: string
	readonly expDate: number
	readonly isBestBefore: boolean
	readonly type: 'dairy' | 'meat' | 'vegetable' | 'fruit'
}

export type Food = Newtype<{ readonly Food: unique symbol }, FoodData>

const isoFood = iso<Food>()

export const deserialize = (f: FoodData): Either<string, Food> => {
	return right(isoFood.wrap(f))
}
export const serialize = (f: Food) => isoFood.unwrap(f)

export const name = (f: Food): FoodData['name'] => isoFood.unwrap(f).name
export const expDate = (f: Food): FoodData['expDate'] =>
	isoFood.unwrap(f).expDate
export const isBestBefore = (f: Food): FoodData['isBestBefore'] =>
	isoFood.unwrap(f).isBestBefore
export const id = (f: Food): FoodData['id'] => isoFood.unwrap(f).id
export const type = (f: Food): FoodData['type'] => isoFood.unwrap(f).type
export const expirationStatus =
	(date: number) =>
	(food: Food): 'ok' | 'expired' | 'check' =>
		N.Ord.compare(isoFood.unwrap(food).expDate, date) < 0 ? 'expired' : 'ok'
