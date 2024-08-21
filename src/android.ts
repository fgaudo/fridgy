import { registerPlugin } from '@capacitor/core'

import { type App, createApp } from '@/app'

import { implementations as capacitorImplementations } from '@/data/capacitor'
import type { FridgySqlitePlugin } from '@/data/capacitor/fridgy-sqlite-plugin'

import { render } from '@/ui'

const root = document.getElementById('root')!

const db = registerPlugin<FridgySqlitePlugin>(
	'FridgySqlitePlugin',
)

const app: App = createApp({
	...capacitorImplementations({
		db,
	}),
})

void render(app, root)
