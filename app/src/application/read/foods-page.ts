import * as O from 'fp-ts-rxjs/Observable'
import * as D from 'fp-ts/Date'
import * as RoM from 'fp-ts/ReadonlyMap'
import { flow, pipe } from 'fp-ts/function'
import { Observable } from 'rxjs'

import { expirationStatus } from '@/domain/food'

export interface FoodsPageModel {
	readonly foods: ReadonlyMap<
		string,
		Readonly<{
			id: string
			name: string
			expDate: Date
			state: 'expired' | 'ok' | 'check'
		}>
	>
}

export interface FoodsPageData {
	readonly foods: ReadonlyMap<
		string,
		Readonly<{
			id: string
			name: string
			expDate: Date
		}>
	>
}

export const foodsPageTransformer: (
	obs: Observable<FoodsPageData>
) => Observable<FoodsPageModel> = flow(
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
