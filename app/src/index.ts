// import { FridgyDatabase } from './infrastructure/dexie'
import { now } from 'fp-ts/lib/Date'
import { fromIO } from 'fp-ts/lib/TaskEither'
import { createRoot } from 'react-dom/client'
import { of } from 'rxjs'

import { foodOverview } from './application/food-overview'
import { Pipe } from './core/pipe'
import { renderApp } from './presentation/react/feature/app/app'

const container = document.getElementById('root')

if (container == null) {
	throw new Error('No #root element in DOM')
}

// const db = new FridgyDatabase()
const root = createRoot(container)

renderApp(root, {
	useCases: {
		foodOverview: new Pipe(
			foodOverview({ getNow: fromIO(now), foods: () => of() })
		)
	},
	title: 'Fridgy'
})

if (!DEBUG && 'serviceWorker' in navigator) {
	void navigator.serviceWorker.register('/sw.js')
}
