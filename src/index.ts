import { registerPlugin } from '@capacitor/core'

import { App } from '@/app'

import { implementations as capacitorUsecases } from '@/data/capacitor'

import { render } from '@/ui'

import type { FridgySqlitePlugin } from './data/capacitor/fridgy-sqlite-plugin'

const root = document.getElementById('root')!

/// const isDev = import.meta.env.DEV

const db = registerPlugin<FridgySqlitePlugin>(
	'FridgySqlitePlugin',
)

void db
	.openDB({ version: 1, name: 'fridgy' })
	.then(() => {
		const app: App = new App({
			...capacitorUsecases({
				db,
			}),
		})

		void render(app, root)
	})
