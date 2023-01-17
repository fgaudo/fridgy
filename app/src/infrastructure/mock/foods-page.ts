import { FoodsPageData, FoodsPageDataObservable } from '@/application/read/foods-page'

import { ReplaySubject } from 'rxjs'

const map: FoodsPageData = {
  foods: Object.fromEntries([...Array(1000).keys()].map(k => [`${k}`, { name: `${k}`, id: `${k}` }]))
}

const subject = new ReplaySubject<FoodsPageData>()
subject.next(map)

export const foodsPage$: FoodsPageDataObservable = subject
