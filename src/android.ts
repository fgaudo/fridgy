import { registerPlugin } from '@capacitor/core'

import { L } from '@/core/imports.ts'

import type { FridgySqlitePlugin } from '@/data/capacitor/fridgy-sqlite-plugin.ts'
import {
	CapacitorService,
	appLive,
} from '@/data/capacitor/index.ts'

import { render } from '@/ui/index.tsx'

const root = document.getElementById('root')!

const db = registerPlugin<FridgySqlitePlugin>(
	'FridgySqlitePlugin',
)

void render(
	L.provide(
		appLive,
		L.succeed(CapacitorService, { db }),
	),
	root,
)
