/* eslint-disable functional/no-return-void */

/* eslint-disable functional/no-expression-statements */

/* eslint-disable functional/no-throw-statements */

/* eslint-disable functional/no-conditional-statements */
// import { FridgyDatabase } from './infrastructure/dexie'
import * as O from 'fp-ts-rxjs/Observable'
import * as OE from 'fp-ts-rxjs/ObservableEither'
import * as Opt from 'fp-ts/Option'
import { pipe } from 'fp-ts/lib/function'
import * as Rx from 'rxjs'

import { foodOverview, next } from './application/usecases/food-overview'
import { renderApp } from './presentation/react/feature/app'

const container = document.getElementById('root')

if (container == null) {
	throw new Error('No #root element in DOM')
}

// const db = new FridgyDatabase()

window.addEventListener('error', function (e) {
	console.error('Error occurred: ', e.error)
	return false
})

window.addEventListener('unhandledrejection', function (e) {
	console.error('Error occurred: ', e.reason)
	return false
})

const foods = [...Array(200).keys()].map(
	a =>
		({
			name: 'asd',
			id: a.toString(10),
			expDate: 0,
			type: 'dairy',
			isBestBefore: true
		}) as const
)

renderApp(container, {
	useCases: {
		foodOverview: {
			next: next,
			observable: foodOverview({
				log: message =>
					pipe(
						O.of(Opt.none),
						Rx.tap(() => console.log(message))
					),
				onceNow: OE.right(new Date().getDate()),
				onFoods: () => Rx.of(foods)
			})
		}
	},
	title: 'Fridgy'
})
