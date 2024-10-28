import {
	type App,
	createApp,
} from '@/app/index.ts'

import { implementations as mockImplementations } from '@/data/mock/index.ts'

import { render } from '@/ui/index.tsx'

const root = document.getElementById('root')!

const app: App = createApp({
	...mockImplementations({}),
})

void render(app, root)
