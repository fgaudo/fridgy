import { Observable } from 'rxjs'

import { FoodsPageModel } from '@/application/read/foods-page'

export interface UseCases {
	readonly foodsPageModel$: Observable<FoodsPageModel>
}
