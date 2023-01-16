import * as RR from 'fp-ts/ReadonlyRecord'
import { Observable } from 'rxjs'

export interface FoodsPageData {
  readonly foods: RR.ReadonlyRecord<string, Readonly<{
    id: string
    name: string
  }>>
}

export type FoodsPageDataObservable = Observable<FoodsPageData>
