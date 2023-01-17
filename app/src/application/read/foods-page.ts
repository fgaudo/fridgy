import * as RR from 'fp-ts/ReadonlyRecord'
import { Observable } from 'rxjs'
import * as O from 'fp-ts-rxjs/Observable'
import { flow, pipe } from 'fp-ts/function'
import { isExpired } from '@/domain/food'
import * as D from 'fp-ts/Date'

export interface FoodsPageModel {
  readonly foods: RR.ReadonlyRecord<string, Readonly<{
    id: string
    name: string
    expDate: Date
    isFoodExpired: boolean
  }>>
}

export interface FoodsPageData {
  readonly foods: RR.ReadonlyRecord<string, Readonly<{
    id: string
    name: string
    expDate: Date
  }>>
}

export const foodsPageTransformer:
(foodsPageData$: Observable<FoodsPageData>) => Observable<FoodsPageModel> =
   flow(
     O.bindTo('data'),
     O.bind('now', _ => pipe(
       O.fromIO(D.now),
       O.map(num => new Date(num))
     )),
     O.map(({ data, now }) => pipe(
       data.foods,
       RR.map(food => {
         const isFoodExpired = isExpired(food)(now)
         return { ...food, isFoodExpired }
       })
     )),
     O.map(foods => ({ foods }))
   )
