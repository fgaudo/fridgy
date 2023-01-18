import * as RM from 'fp-ts/ReadonlyMap'

import { Observable } from 'rxjs'
import * as O from 'fp-ts-rxjs/Observable'
import { flow, pipe } from 'fp-ts/function'
import { isExpired } from '@/domain/food'
import * as D from 'fp-ts/Date'
import * as RO from 'fp-ts-rxjs/ReaderObservable'

export interface FoodsPageModel {
  readonly foods: ReadonlyMap<string, Readonly<{
    id: string
    name: string
    expDate: Date
    isFoodExpired: boolean
  }>>
}

export interface FoodsPageData {
  readonly foods: ReadonlyMap<string, Readonly<{
    id: string
    name: string
    expDate: Date
  }>>
}

export const foodsPageTransformer: RO.ReaderObservable<Observable<FoodsPageData>, FoodsPageModel> =
   flow(
     O.bindTo('data'),
     O.bind('now', () => pipe(
       O.fromIO(D.now),
       O.map(num => new Date(num))
     )),
     O.map(({ data, now }) => pipe(
       data.foods,
       RM.map(food => {
         const isFoodExpired = isExpired(now)(food)
         return { ...food, isFoodExpired }
       })
     )),
     O.map(foods => ({ foods }))
   )
