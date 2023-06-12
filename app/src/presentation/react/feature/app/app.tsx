import {
	Outlet,
	ReactRouter,
	RootRoute,
	Route,
	RouterProvider
} from '@tanstack/react-router'
import { StrictMode, createContext, useContext } from 'react'
import { Root } from 'react-dom/client'

import { UseCases } from '@/application'

import { FoodsPage } from '../home/home'

interface Config {
	readonly useCases: UseCases
	readonly title: string
}

export const GlobalContext = createContext<Config>(null as never)
export const useGlobalContext: () => Config = () => useContext(GlobalContext)

const rootRoute = new RootRoute({
	component: () => <Outlet />
})

const routeTree = rootRoute.addChildren([
	new Route({
		getParentRoute: () => rootRoute,
		path: '/',
		component: FoodsPage
	})
])

const router = new ReactRouter({ routeTree })

export function renderApp(element: Root, config: Config): void {
	element.render(
		<StrictMode>
			<GlobalContext.Provider value={config}>
				<RouterProvider router={router} />
			</GlobalContext.Provider>
		</StrictMode>
	)
}
