import { eq as Eq } from 'fp-ts'
import * as t from 'io-ts'
import { withFallback } from 'io-ts-types'

import { Food } from '@/domain/food'

export const FoodDTO = t.readonly(
	t.type({
		id: t.string,
		name: withFallback(
			t.union([t.string, t.undefined]),
			undefined,
		),
	}),
)

export interface FoodDTO {
	readonly id: string
	readonly name: string
}

export const foodDataEq: Eq.Eq<FoodDTO> =
	Eq.fromEquals((a, b) => a.id === b.id)

export function toFoodEntity(
	foodData: FoodDTO,
): Food {
	return foodData
}
