import { either as E } from 'fp-ts'

import { App } from '@/app'

import { implementations as dexieUseCases } from '@/data/dexie'
import { createDB } from '@/data/dexie/dexie'
import { useCases as mockUseCases } from '@/data/mock'
import { implementations as systemUseCases } from '@/data/system'
import { log } from '@/data/system/write/log'

import { render, renderError } from '@/ui'

const root = document.getElementById('root')!

const DEVELOPMENT = false

// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
if (DEVELOPMENT) {
	const app: App = new App({
		...mockUseCases({ dataLogPrefix: 'DATA' }),
		...systemUseCases({
			appLogPrefix: 'APP',
			uiLogPrefix: 'UI',
		}),
	})

	render(app, root)
} else {
	const result = await createDB()

	if (E.isLeft(result)) {
		renderError(root, result.left)
	} else {
		const app: App = new App({
			...dexieUseCases({
				db: result.right,
				log: log({ prefix: 'data' }),
			}),
			...systemUseCases({
				appLogPrefix: 'app',
				uiLogPrefix: 'ui',
			}),
		})

		render(app, root)
	}
}
