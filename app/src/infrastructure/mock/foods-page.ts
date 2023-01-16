import { FoodsPageData, FoodsPageDataObservable } from '@/application/read/foods-page'

import { ReplaySubject } from 'rxjs'

const map: FoodsPageData = {
  foods: {
    1: { name: 'Milk', id: '1' },
    2: { name: 'Meat', id: '2' },
    3: { name: 'Yogurt', id: '3' },
    4: { name: 'Egg', id: '4' }
  }
}

const subject = new ReplaySubject<FoodsPageData>()
subject.next(map)

export const foodsPage$: FoodsPageDataObservable = subject
