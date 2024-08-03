import * as SR from '@solidjs/router'
import type { Component } from 'solid-js'

import type { App } from '@/app'

import { useNavigate } from './core/helpers'
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
		</SR.Router>
	)
}

export const useFridgyNavigate = () => {
	const navigator =
		useNavigate<
			(typeof ROUTES)[keyof typeof ROUTES]
		>()

	return (
		route: keyof typeof ROUTES,
		options?: Partial<SR.NavigateOptions>,
	) => {
		navigator(ROUTES[route], options)
	}
}
