import { Option, some } from 'fp-ts/lib/Option'
import { Newtype, iso } from 'newtype-ts'

const isoFood = iso<Food>()

export type Food = Newtype<
	{ readonly Food: unique symbol },
	{ name: string }
>

export const name: (
	food: Food,
) => string = food => isoFood.unwrap(food).name

export const areEqual = (_f1: Food, _f2: Food) =>
	false

export const createFood: (f: {
	name: string
}) => Option<Food> = food =>
	some(isoFood.wrap({ name: food.name }))
