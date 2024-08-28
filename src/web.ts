import {
	type App,
	createApp,
} from '@/app/index.js'

import { implementations as mockImplementations } from '@/data/mock/index.js'

import { render } from '@/ui/index.jsx'

const root = document.getElementById('root')!

const app: App = createApp({
	...mockImplementations({}),
})

void render(app, root)
