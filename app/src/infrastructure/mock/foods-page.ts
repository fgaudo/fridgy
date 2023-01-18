import { Observable, ReplaySubject } from 'rxjs'

import { FoodsPageData } from '@/application/read/foods-page'

const foods = ['Milk', 'Meat', 'Yogurt', 'Eggs', 'Salad', 'Carrots']

const map: FoodsPageData = {
  foods: new Map([...Array(1000).keys()]
    .map(k => [
      `${k}`,
      {
        name: `${foods[Math.floor(Math.random() * 6)]}`,
        id: `${k}`,
        expDate: new Date()
      }
    ])
  )
}

const subject = new ReplaySubject<FoodsPageData>()
subject.next(map)

export const foodsPageData$: Observable<FoodsPageData> = subject
