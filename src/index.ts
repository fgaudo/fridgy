import { App } from '@/app'

import { appUseCases } from '@/data'

import { render } from '@/ui'

/*
document.addEventListener(
	'deviceready',
	function () {
		const root = document.getElementById('root')!

		const db = window.sqlitePlugin.openDatabase({
			name: 'my.db',
			location: 'default',
		})

		const app: App<string> = new App<string>(
			appUseCases({}),
		)

		render(app, root)
	},
)
*/
const root = document.getElementById('root')!

const app: App<string> = new App<string>(
	appUseCases({}),
)

render(app, root)
