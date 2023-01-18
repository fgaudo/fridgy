import * as D from 'fp-ts/Date'
import { flow, pipe } from 'fp-ts/function'
import * as RoM from 'fp-ts/ReadonlyMap'
import * as O from 'fp-ts-rxjs/Observable'
import * as RO from 'fp-ts-rxjs/ReaderObservable'
import { Observable } from 'rxjs'

import { expirationStatus } from '@/domain/food'

export interface FoodsPageModel {
  readonly foods: ReadonlyMap<string, Readonly<{
    id: string
    name: string
    expDate: Date
    foodState: 'expired' | 'ok' | 'check'
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
     O.bind('now', () => O.fromIO(D.create)),
     O.map(({ data, now }) => pipe(
       data.foods,
       RoM.map(food => ({
         ...food,
         foodState: expirationStatus(now)(food)
       }))
     )),
     O.map(foods => ({ foods }))
   )
