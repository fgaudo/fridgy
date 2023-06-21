/* eslint-disable functional/no-return-void */

/* eslint-disable functional/no-expression-statements */

/* eslint-disable functional/no-throw-statements */

/* eslint-disable functional/no-conditional-statements */
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
		onceNow: OE.right(new Date().getDate()),
		onFoods: () => of()
	}
}).subscribe({
	next: useCases => {
		renderApp(root, {
			useCases,
			title: 'Fridgy'
		})
	}
})
