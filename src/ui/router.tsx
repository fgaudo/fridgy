import * as SR from '@solidjs/router'
import type { Component } from 'solid-js'

import type { App } from '@/app'

import AddProduct from './pages/AddProduct'
import { createStore as createAddProductStore } from './pages/AddProduct/store'
import Home from './pages/Home'
import { createStore as createHomeStore } from './pages/Home/store'

export const ROUTES = {
	home: '/',
	addProduct: '/add-product',
} as const

export const Router: Component<{
	app: App
}> = props => {
	return (
		<SR.Router>
			<SR.Route
				path={ROUTES.home}
				component={Home(() => ({
					store: createHomeStore(props.app),
					navigate: useFridgyNavigate(),
				}))}
			/>
			<SR.Route
				path={ROUTES.addProduct}
				component={AddProduct(() => ({
					store: createAddProductStore(props.app),
					navigate: useFridgyNavigate(),
				}))}
			/>
		</SR.Router>
	)
}

export type Navigator = (
	route: keyof typeof ROUTES,
	options?: Partial<SR.NavigateOptions>,
) => void

export const useFridgyNavigate: () => Navigator =
	() => {
		const navigator = SR.useNavigate()

		return (
			route: keyof typeof ROUTES,
			options?: Partial<SR.NavigateOptions>,
		) => {
			navigator(ROUTES[route], options)
		}
	}
