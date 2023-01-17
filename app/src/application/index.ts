import { Observable } from 'rxjs'
import { FoodsPageModel } from './read/foods-page'

export interface UseCases {
  readonly foodsPageModel$: Observable<FoodsPageModel>
}
