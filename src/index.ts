import { App as CAP } from '@capacitor/app'

import { App } from '@/app'

import { implementations as dexieUseCases } from '@/data/dexie'
import { createDB } from '@/data/dexie/dexie'
import { implementations as systemUseCases } from '@/data/system'
import { log } from '@/data/system/write/log'

import { render } from '@/ui'

import { onResumeInit } from './ui/core/capacitor'

const root = document.getElementById('root')!

const isDev = import.meta.env.DEV

const db = createDB()

void onResumeInit()
	.then(() =>
		CAP.addListener('backButton', () => {
			if (window.history.length <= 0) {
				void CAP.exitApp()
				return
			}
			window.history.back()
		}),
	)
	.then(() => {
		const app: App = new App({
			...dexieUseCases({
				db,
				log: log({ prefix: 'data', isDev }),
			}),
			...systemUseCases({
				appLogPrefix: 'app',
				uiLogPrefix: 'ui',
			}),
		})
		render(app, root)
	})
