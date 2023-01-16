// import { FridgyDatabase } from './infrastructure/dexie'
import { foodsPage$ } from '@/infrastructure/mock/foods-page'
import { renderApp } from '@/presentation/preact'

const root = document.getElementById('root')

if (root == null) {
  throw new Error('No #root element in DOM')
}

// const db = new FridgyDatabase()

renderApp(root, {
  useCases: {
    foodsPageData$: foodsPage$
  }
})

if (!DEBUG && 'serviceWorker' in navigator) {
  void navigator.serviceWorker.register('/sw.js')
}
