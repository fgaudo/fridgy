import { registerPlugin } from '@capacitor/core'

import { type App, createApp } from '@/app'

import { implementations as capacitorImplementations } from '@/data/capacitor'
import { implementations as mockImplementations } from '@/data/mock'

import { render } from '@/ui'

import type { FridgySqlitePlugin } from './data/capacitor/fridgy-sqlite-plugin'

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const root = document.getElementById('root')!

/// const isDev = import.meta.env.DEV

const db = registerPlugin<FridgySqlitePlugin>(
	'FridgySqlitePlugin',
)

const isDev = import.meta.env.DEV

if (isDev) {
	const app: App = createApp({
		...mockImplementations({}),
	})

	void render(app, root)
} else {
	void db
		.openDB({ version: 1, name: 'fridgy' })
		.then(() => {
			const app: App = createApp({
				...capacitorImplementations({
					db,
				}),
			})

			void render(app, root)
		})
}
