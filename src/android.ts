import { registerPlugin } from '@capacitor/core'

import {
	type App,
	createApp,
} from '@/app/index.js'

import { implementations as capacitorImplementations } from '@/data/capacitor/index.js'

import type { FridgySqlitePlugin } from './data/capacitor/fridgy-sqlite-plugin.js'
import { render } from './ui/index.jsx'

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
