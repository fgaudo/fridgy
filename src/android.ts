import { registerPlugin } from '@capacitor/core'

import {
	type App,
	createApp,
} from '@/app/index.ts'

import { implementations as capacitorImplementations } from '@/data/capacitor/index.ts'

import type { FridgySqlitePlugin } from './data/capacitor/fridgy-sqlite-plugin.ts'
import { render } from './ui/index.tsx'

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
