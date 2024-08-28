import * as SR from '@solidjs/router'
import type { Component } from 'solid-js'

import type { App } from '@/app/index.js'

import { About } from './pages/About/index.jsx'
import AddProduct from './pages/AddProduct/index.jsx'
import { createStore as createAddProductStore } from './pages/AddProduct/store/index.js'
import Home from './pages/Home/index.jsx'
import { createStore as createHomeStore } from './pages/Home/store/index.js'

export const ROUTES = {
	home: '/',
	addProduct: '/add-product',
	about: '/about',
} as const

export const Router: Component<{
	app: App
}> = props => {
	return (
		<SR.Router>
			<SR.Route
				path={ROUTES.home}
				component={Home(() =>
					createHomeStore(props.app),
				)}
			/>
			<SR.Route
				path={ROUTES.addProduct}
				component={AddProduct(() =>
					createAddProductStore(props.app),
				)}
			/>
			<SR.Route
				path={ROUTES.about}
				component={About()}
			/>
		</SR.Router>
	)
}

export type Navigator = (
	route: keyof typeof ROUTES | number,
	options?: Partial<SR.NavigateOptions>,
) => void

export const useFridgyNavigate: () => Navigator =
	() => {
		const navigator = SR.useNavigate()

		return (
			route: keyof typeof ROUTES | number,
			options?: Partial<SR.NavigateOptions>,
		) => {
			if (typeof route === 'number') {
				navigator(route)
				return
			}
			navigator(ROUTES[route], options)
		}
	}
