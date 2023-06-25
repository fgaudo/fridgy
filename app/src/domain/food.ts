import * as E from 'fp-ts/Either'
import { flow } from 'fp-ts/lib/function'
import * as N from 'fp-ts/number'
import { Iso } from 'monocle-ts'
import { Newtype, iso } from 'newtype-ts'

export type FoodData = Readonly<{
	name: string
	expDate: number
	isBestBefore: boolean
	type: 'dairy' | 'meat' | 'vegetable' | 'fruit'
}>

const isoFood: Iso<Food, FoodData> = iso<Food>()

export type Food = Newtype<{ readonly Food: unique symbol }, FoodData>

export const serialize: Serialize = flow(isoFood.unwrap)

export const name: Name = food => isoFood.unwrap(food).name

export const expDate: ExpirationDate = food => isoFood.unwrap(food).expDate

export const isBestBefore: IsBestBefore = food =>
	isoFood.unwrap(food).isBestBefore

export const type: FoodType = food => isoFood.unwrap(food).type

export const expirationStatus: ExpirationStatus = date => food =>
	N.Ord.compare(isoFood.unwrap(food).expDate, date) < 0 ? 'expired' : 'ok'

export const isValid: IsValid = () => true

export const createFood: CreateFood = flow(isoFood.wrap, E.right)

export const fromExisting: FromExisting = flow(isoFood.wrap)

type Serialize = (food: Food) => FoodData
type Name = (food: Food) => FoodData['name']
type ExpirationDate = (food: Food) => FoodData['expDate']
type IsBestBefore = (food: Food) => FoodData['isBestBefore']
type FoodType = (food: Food) => FoodData['type']
type ExpirationStatus = (
	data: number
) => (food: Food) => 'ok' | 'expired' | 'check'
type IsValid = (food: Food) => boolean
type CreateFood = (data: FoodData) => E.Either<never, Food>
type FromExisting = (data: FoodData) => Food
