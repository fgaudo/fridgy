import { App } from '@/app'

import { implementations as dexieUseCases } from '@/data/dexie'
import { createDB } from '@/data/dexie/dexie'
import { implementations as systemUseCases } from '@/data/system'
import { log } from '@/data/system/write/log'

import { render } from '@/ui'

const root = document.getElementById('root')!

const isDev = import.meta.env.DEV

const db = createDB()

const app: App = new App({
	...dexieUseCases({
		db,
		log: log({ prefix: 'data', isDev }),
	}),
	...systemUseCases({
		appLogPrefix: 'app',
		uiLogPrefix: 'ui',
	}),
})

render(app, root)
