import { Subject } from 'rxjs'

import { App } from '@/app'

import { useCases as mockUseCases } from '@/data/mock'
import { implementations as systemUseCases } from '@/data/system'

import { render } from '@/ui'

import { useCases as sqliteImplementations } from './data/sqlite'

const root = document.getElementById('root')!

const DEVELOPMENT = true

// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
if (DEVELOPMENT) {
	const app: App = new App({
		...mockUseCases({ dataLogPrefix: 'data' }),
		...systemUseCases({
			appLogPrefix: 'app',
			uiLogPrefix: 'ui',
		}),
	})

	render(app, root)
} else {
	document.addEventListener(
		'deviceready',
		function () {
			const db = window.sqlitePlugin.openDatabase(
				{
					name: 'my.db',
					location: 'default',
				},
			)

			const app: App = new App({
				...sqliteImplementations({
					prefix: 'data',
					db,
				}),
				...systemUseCases({
					appLogPrefix: 'app',
					uiLogPrefix: 'ui',
				}),

				deleteProductsByIds: mockUseCases({
					dataLogPrefix: 'data',
				}).deleteProductsByIds,
			})

			render(app, root)
		},
	)
}
