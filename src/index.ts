import { App } from '@/app'

import { appUseCases } from '@/data'

import { render } from '@/ui'

const root = document.getElementById('root')!

const app: App = new App(appUseCases({}))

render(app, root)
