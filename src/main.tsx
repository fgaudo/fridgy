import { App } from '@/app/app'
import { createApp } from '@/data/app'
import { render } from '@/ui/main'

try {
	render((await createApp()) satisfies App)
} catch (error) {
	console.error(error)
}
