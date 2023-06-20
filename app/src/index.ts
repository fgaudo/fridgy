// import { FridgyDatabase } from './infrastructure/dexie'
import * as OE from 'fp-ts-rxjs/ObservableEither'
import { createRoot } from 'react-dom/client'
import { of } from 'rxjs'

import { App } from './application'
import { renderApp } from './presentation/react/feature/app/app'

const container = document.getElementById('root')

if (container == null) {
	throw new Error('No #root element in DOM')
}

// const db = new FridgyDatabase()
const root = createRoot(container)

new App({
	foodOverviewDep: {
		now$: OE.right(new Date().getDate()),
		getFoods: () => of()
	}
}).subscribe({
	next: useCases => {
		renderApp(root, {
			useCases,
			title: 'Fridgy'
		})
	}
})
