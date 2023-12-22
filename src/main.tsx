import { App } from '@/app/app.ts'

import { render } from '@/ui/main.tsx'

import { createApp } from '@/data/app.ts'

;(async () => {
	const app: App = await createApp()

	render(app)
})().catch(e => {
	console.error(e)
})
