/* eslint-disable functional/no-return-void */

/* eslint-disable functional/no-expression-statements */

/* eslint-disable functional/no-throw-statements */

/* eslint-disable functional/no-conditional-statements */
// import { FridgyDatabase } from './infrastructure/dexie'
import * as O from 'fp-ts-rxjs/Observable'
import * as OE from 'fp-ts-rxjs/ObservableEither'
import * as Opt from 'fp-ts/Option'
import { pipe } from 'fp-ts/lib/function'
import { createRoot } from 'react-dom/client'
import * as Rx from 'rxjs'

import { App } from './application'
import { Single } from './core/single'
import { renderApp } from './presentation/react/feature/app/app'

const container = document.getElementById('root')

if (container == null) {
	throw new Error('No #root element in DOM')
}

// const db = new FridgyDatabase()
const root = createRoot(container)

window.addEventListener('error', function (e) {
	console.error('Error occurred: ', e.error)
	return false
})

window.addEventListener('unhandledrejection', function (e) {
	console.error('Error occurred: ', e.reason)
	return false
})

new App({
	foodOverviewDep: {
		log: message =>
			pipe(
				O.of(Opt.none),
				Rx.tap(() => console.log(message)),
				a => new Single(a)
			),
		onceNow: new Single(OE.right(new Date().getDate())),
		onFoods: () =>
			Rx.of([
				{ name: 'asd', id: '', expDate: 0, type: 'dairy', isBestBefore: true },
				{ name: 'asd1', id: '1', expDate: 0, type: 'dairy', isBestBefore: true }
			])
	}
}).subscribe(useCases => {
	renderApp(root, {
		useCases,
		title: 'Fridgy'
	})
})
