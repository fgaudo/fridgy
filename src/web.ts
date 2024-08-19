import { type App, createApp } from '@/app'

import { implementations as mockImplementations } from '@/data/mock'

import { render } from '@/ui'

const root = document.getElementById('root')!

const app: App = createApp({
	...mockImplementations({}),
})

void render(app, root)
