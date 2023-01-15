import { FridgyDatabase } from './infrastructure/dexie'
import { foodsPageObservable as foodsPageObservableFromDexie } from './infrastructure/dexie/get-foods'
import { renderApp } from './presentation/app'

const root = document.getElementById('root')

if (root == null) {
  throw new Error('No #root element in DOM')
}

const db = new FridgyDatabase()

renderApp(root, {
  useCases: {
    getFoodsPage: foodsPageObservableFromDexie({ db })
  }
})

if (!DEBUG && 'serviceWorker' in navigator) {
  void navigator.serviceWorker.register('/sw.js')
}
