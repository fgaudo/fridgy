import {
	Either,
	left,
	right,
} from 'fp-ts/lib/Either'
import { match } from 'fp-ts/lib/Option'
import { pipe } from 'fp-ts/lib/function'
import { Newtype, iso } from 'newtype-ts'

import * as RoNeM from '@/core/readonly-non-empty-map'

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

type ValidationError = RoNeM.ReadonlyNonEmptyMap<
	'name' | 'expDate',
	string
>
export const createFood: (f: {
	name: string
	expDate: number
}) => Either<
	ValidationError,
	Food
> = foodData => {
	const map = new Map<
		'name' | 'expDate',
		string
	>()

	if (foodData.name.trim().length === 0) {
		map.set(
			'name',
			'Product name cannot be empty',
		)
	}

	return pipe(
		map,
		RoNeM.fromMap,
		match(
			() => right(isoFood.wrap(foodData)),
			left,
		),
	)
}
