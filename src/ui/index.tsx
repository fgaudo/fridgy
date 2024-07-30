import '@fontsource-variable/comfortaa/index.css'
import '@fontsource-variable/material-symbols-rounded/full.css'
import '@fontsource-variable/roboto-flex/full.css'
import {
	Hct,
	SchemeTonalSpot,
	argbFromHex,
} from '@material/material-color-utilities'
import { Route, Router } from '@solidjs/router'
import { createSignal, onMount } from 'solid-js'
import { render as solidRender } from 'solid-js/web'

import type { App } from '@/app'

import {
	AppContext,
	type FridgyContext,
} from '@/ui/context'
import '@/ui/index.css'
import { applyTheme } from '@/ui/material-web'
import AddProduct from '@/ui/pages/AddProduct'
import Home from '@/ui/pages/Home'

const MAIN_COLOR = '#DD7230'

export function renderError(
	root: HTMLElement,
	message: string,
): void {
	solidRender(() => {
		let dialog: HTMLDialogElement

		onMount(() => {
			dialog.showModal()
		})

		return (
			<dialog
				ref={dialog!}
				class="text-red-800 border-red-300 bg-red-50 dark:bg-gray-800 dark:text-red-400 dark:border-red-800 rounded-lg border p-4"
				role="alert">
				<div class="flex items-center">
					<svg
						class="me-2 h-4 w-4 flex-shrink-0"
						aria-hidden="true"
						xmlns="http://www.w3.org/2000/svg"
						fill="currentColor"
						viewBox="0 0 20 20">
						<path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5ZM9.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM12 15H8a1 1 0 0 1 0-2h1v-3H8a1 1 0 0 1 0-2h2a1 1 0 0 1 1 1v4h1a1 1 0 0 1 0 2Z" />
					</svg>
					<span class="sr-only">Info</span>
					<h3 class="text-lg font-medium">
						Something went wrong! :(
					</h3>
				</div>
				<div class="text-sm mb-4 mt-2">
					{message}
				</div>
			</dialog>
		)
	}, root)
}

export function render(
	app: App,
	root: HTMLElement,
): void {
	const scheme = new SchemeTonalSpot(
		Hct.fromInt(argbFromHex(MAIN_COLOR)),
		false,
		0.1,
	)

	applyTheme(document.body, scheme)

	solidRender(
		() => {
			const [isLoading, setLoading] =
				createSignal(false)

			const context: FridgyContext = {
				app,
				showLoading: setLoading,
			}

			return (
				<>
					<div
						class="fixed bottom-0 left-0 right-0 top-0 z-[99] bg-[#00000023] transition-all"
						classList={{
							'opacity-0 pointer-events-none':
								!isLoading(),
						}}>
						<md-circular-progress
							class="relative left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
							prop:indeterminate={true}
						/>
					</div>
					<AppContext.Provider value={context}>
						<Router>
							<Route
								path="/"
								component={Home}
							/>
							<Route
								path="/add-product"
								component={AddProduct}
							/>
						</Router>
					</AppContext.Provider>
				</>
			)
		},

		root,
	)
}
