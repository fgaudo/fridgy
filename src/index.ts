import { App } from '@/app'

import { appUseCases } from '@/data'

import { render } from '@/ui'

/*document.addEventListener(
	'deviceready',
	function() {
		const root = document.getElementById('root')

		if (root === null) {
			throw new Error('No #root element found')
		}

		const db = window.sqlitePlugin.openDatabase({
			name: 'my.db',
			location: 'default',
		})

		const app: App<string> = new App<string>(
			appUseCases({ db }),
		)

		render(app, root)
	},
)*/

const app: App<string> = new App<string>(
	appUseCases({}),
)

render(app, document.getElementById('root')!)
