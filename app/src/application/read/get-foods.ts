import { ObservableEither } from 'fp-ts-rxjs/lib/ObservableEither'

export interface FoodsPageData {
  foods: Array<{
    id: string
    name: string
  }>
}

export interface FoodsPageDataError {
  type: 'io'
  message: string
}

export type FoodsPageDataObservable = ObservableEither<FoodsPageDataError, FoodsPageData>
