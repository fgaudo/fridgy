/* eslint-disable functional/no-return-void */

/* eslint-disable functional/no-expression-statements */

/* eslint-disable functional/no-throw-statements */

/* eslint-disable functional/no-conditional-statements */
// import { FridgyDatabase } from './infrastructure/dexie'
import * as OE from 'fp-ts-rxjs/ObservableEither'
import { createRoot } from 'react-dom/client'
import * as Rx from 'rxjs'

import { App } from './application'
import { error, info } from './core/logging'
import { Single } from './core/single'
import { renderApp } from './presentation/react/feature/app/app'

const container = document.getElementById('root')

if (container == null) {
	throw new Error('No #root element in DOM')
}

// const db = new FridgyDatabase()
const root = createRoot(container)

window.addEventListener('error', function (e) {
	alert('Error occurred: ' + e.error.message)
	return false
})

window.addEventListener('unhandledrejection', function (e) {
	alert('Error occurred: ' + e.reason)
	return false
})

new App({
	foodOverviewDep: {
		onceNow: new Single(OE.right(new Date().getDate())),
		onFoods: () => Rx.of(),
		onceInfo: info,
		onceError: error,
		onceFlow: new Single(Rx.of())
	}
}).subscribe(useCases => {
	renderApp(root, {
		useCases,
		title: 'Fridgy'
	})
})
