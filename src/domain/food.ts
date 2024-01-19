import {
	type Either,
	left,
	right,
} from 'fp-ts/lib/Either'
import { type Newtype, iso } from 'newtype-ts'

import type { AtLeastOne } from '@/core/types'

const isoFood = iso<Food>()

export type Food = Newtype<
	{ readonly Food: unique symbol },
	{ name: string; expDate: number }
>

export const name: (
	food: Food,
) => string = food => isoFood.unwrap(food).name

export const expDate: (
	food: Food,
) => number = food => isoFood.unwrap(food).expDate

export const areEqual = (_f1: Food, _f2: Food) =>
	false

export const enum NameError {
	missingName = 0,
}

interface Errors {
	name: NameError
}

export const createFood: (f: {
	name: string
	expDate: number
}) => Either<
	AtLeastOne<Errors>,
	Food
> = foodData => {
	let errors: Partial<Errors> = {}

	if (foodData.name.trim().length > 0) {
		errors = {
			...errors,
			name: NameError.missingName,
		}
	}

	if (Object.keys(errors).length > 0) {
		return left(errors as AtLeastOne<Errors>)
	}
	return right(isoFood.wrap(foodData))
}
