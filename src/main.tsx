import { App } from '@/application/app.ts'

import { render } from '@/presentation/main.tsx'

import { createApp } from '@/data/app.ts'

;(async () => {
	const app: App = await createApp()

	render(app)
})().catch(e => {
	console.error(e)
})
