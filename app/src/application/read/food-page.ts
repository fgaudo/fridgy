import * as O from 'fp-ts-rxjs/Observable'
import * as D from 'fp-ts/Date'
import * as RoM from 'fp-ts/ReadonlyMap'
import { flow, pipe } from 'fp-ts/function'
import { Observable } from 'rxjs'

import { Food, expirationStatus } from '@/domain/food'

export { FoodIdEq, FoodIdOrd } from '@/domain/food'

export interface FoodModel {
	readonly id: Food['id']
	readonly name: string
	readonly expDate: Date
	readonly state: 'expired' | 'ok' | 'check'
}

export interface FoodPageModel {
	readonly foods: ReadonlyMap<FoodModel['id'], FoodModel>
}

export interface FoodsPageData {
	readonly foods: ReadonlyMap<
		Food['id'],
		Readonly<{
			id: Food['id']
			name: string
			expDate: Date
		}>
	>
}

export const foodsPageTransformer: (
	obs: Observable<FoodsPageData>
) => Observable<FoodPageModel> = flow(
	O.bindTo('data'),
	O.bind('now', () => O.fromIO(D.create)),
	O.map(({ data, now }) =>
		pipe(
			data.foods,
			RoM.map(food => ({
				...food,
				state: expirationStatus(now)(food)
			}))
		)
	),
	O.map(foods => ({ foods }))
)
