import '@fontsource-variable/material-symbols-rounded/full.css'
import '@fontsource-variable/roboto-flex/full.css'
import {
	Hct,
	SchemeTonalSpot,
	argbFromHex,
} from '@material/material-color-utilities'
import { Route, Router } from '@solidjs/router'
import { render as solidRender } from 'solid-js/web'

import { App } from '@/app'

import AddFood from '@/ui/pages/AddFood'
import Overview from '@/ui/pages/Overview'

import { AppContext } from './context'
import './index.css'
import { applyTheme } from './material-web'

const MAIN_COLOR = '#DD7230'

export function render(
	app: App<string>,
	root: HTMLElement,
): void {
	const scheme = new SchemeTonalSpot(
		Hct.fromInt(argbFromHex(MAIN_COLOR)),
		false,
		0.1,
	)

	applyTheme(document.body, scheme)

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
