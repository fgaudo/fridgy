import { registerPlugin } from '@capacitor/core'

import { App } from '@/app'

import { implementations as capacitorUsecases } from '@/data/capacitor'
import { implementations as systemUseCases } from '@/data/system'
import { log } from '@/data/system/write/log'

import { render } from '@/ui'

import type { FridgySqlitePlugin } from './data/capacitor/fridgy-sqlite-plugin'

const root = document.getElementById('root')!

const isDev = import.meta.env.DEV

const db = registerPlugin<FridgySqlitePlugin>(
	'FridgySqlitePlugin',
)

const app: App = new App({
	...capacitorUsecases({
		db,
		log: log({ prefix: 'data', isDev }),
	}),
	...systemUseCases({
		isDev,
		appLogPrefix: 'app',
		uiLogPrefix: 'ui',
	}),
})

void render(app, root)
