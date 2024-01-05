import { eq as Eq } from 'fp-ts'
import * as t from 'io-ts'
import { withFallback } from 'io-ts-types'
import { Food } from '@/domain/food'

export const FoodData = t.readonly(
	t.type({
		id: t.string,
		name: withFallback(t.union([t.string, t.undefined]), undefined),
	}),
)

export interface FoodData {
	readonly id: string
	readonly name: string
}

export const foodDataEq: Eq.Eq<FoodData> = Eq.fromEquals(
	(a, b) => a.id === b.id,
)

export function toFoodEntity(foodDatas: FoodData): Food {
	return { id: 'id', name: 'asd' }
}
