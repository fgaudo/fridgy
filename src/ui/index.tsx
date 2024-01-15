import {
	applyTheme,
	argbFromHex,
	themeFromSourceColor,
} from '@material/material-color-utilities'
import { Route, Router } from '@solidjs/router'
import { render as solidRender } from 'solid-js/web'

import { App } from '@/app'

import AddFood from '@/ui/pages/AddFood'
import Overview from '@/ui/pages/Overview'

import { AppContext } from './context'
import './index.css'
import './material-web'

const MAIN_COLOR = '#EF6461'

export function render(
	app: App<string>,
	root: HTMLElement,
): void {
	// Get the theme from a hex color
	const theme = themeFromSourceColor(
		argbFromHex(MAIN_COLOR),
	)

	applyTheme(theme, {
		target: document.body,
	})

	solidRender(
		() => (
			<AppContext.Provider value={app}>
				<Router>
					<Route
						path="/"
						component={Overview}
					/>
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
