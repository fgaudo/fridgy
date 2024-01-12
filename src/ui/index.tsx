import { render as solidRender } from 'solid-js/web'

import { App } from '@/app'

import Overview from '@/ui/Overview'

import { AppContext } from './context'
import './index.css'

export function render(
	app: App<string>,
	root: HTMLElement,
): void {
	solidRender(
		() => (
			<AppContext.Provider value={app}>
				<Overview />
			</AppContext.Provider>
		),

		root,
	)
}
