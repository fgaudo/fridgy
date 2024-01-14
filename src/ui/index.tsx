import { Route, Router } from '@solidjs/router'
import { render as solidRender } from 'solid-js/web'

import { App } from '@/app'

import AddFood from '@/ui/pages/AddFood'
import Overview from '@/ui/pages/Overview'

import { AppContext } from './context'
import './index.css'

export function render(
	app: App<string>,
	root: HTMLElement,
): void {
	solidRender(
		() => (
			<AppContext.Provider value={app}>
				<Router>
					<Route
						path="/"
						component={Overview}
					/>{' '}
					<Route
						path="/add-food"
						component={AddFood}
					/>
				</Router>
			</AppContext.Provider>
		),

		root,
	)
}
