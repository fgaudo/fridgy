// import { FridgyDatabase } from './infrastructure/dexie'
import { createRoot } from 'react-dom/client'

import { foodsPageTransformer } from '@/application/read/food-page'

import { renderApp } from '@/presentation/react'

import { foodsPageData$ } from '@/infrastructure/mock/foods-page'

const container = document.getElementById('root')

if (container == null) {
	throw new Error('No #root element in DOM')
}

// const db = new FridgyDatabase()
const root = createRoot(container)

renderApp(root, {
	useCases: {
		foodsPageModel$: foodsPageTransformer(foodsPageData$)
	},
	title: 'Fridgy'
})

if (!DEBUG && 'serviceWorker' in navigator) {
	void navigator.serviceWorker.register('/sw.js')
}
