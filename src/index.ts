import { pipe } from 'fp-ts/function'

import { App } from '@/app'

import { appUseCases } from '@/data'

import { render } from '@/ui'

document.addEventListener(
	'deviceready',
	function () {
		const db = window.sqlitePlugin.openDatabase({
			name: 'my.db',
			location: 'default',
		})

		const app: App = new App(appUseCases({ db }))

		render(app)
	},
)
