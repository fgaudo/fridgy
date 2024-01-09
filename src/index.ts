import { pipe } from 'fp-ts/lib/function'

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

		const app = pipe(
			appUseCases({ db }),
			useCases => new App(useCases),
		)

		render(app)
	},
)
