import { function as F } from 'fp-ts'

import { App } from '@/app'

import { useCases as mockUseCases } from '@/data/mock'
import { useCases as systemUseCases } from '@/data/system'

import { render } from '@/ui'

const root = document.getElementById('root')!

const app: App = new App({
	...mockUseCases({ dataLogPrefix: 'data' }),
	...systemUseCases({
		appLogPrefix: 'app',
		uiLogPrefix: 'ui',
	}),
})

render(app, root)
