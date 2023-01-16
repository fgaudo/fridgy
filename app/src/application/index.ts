import { FoodsPageDataObservable } from './read/foods-page'

export interface UseCases {
  readonly foodsPageData$: FoodsPageDataObservable
}
