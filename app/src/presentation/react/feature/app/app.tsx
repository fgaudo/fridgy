import { StrictMode, createContext, useContext } from 'react'
import { Root } from 'react-dom/client'
import { RouterProvider, createHashRouter } from 'react-router-dom'

import { UseCases } from '@/application'

import { FoodsPage } from '../home/home'

interface Config {
	readonly useCases: UseCases
	readonly title: string
}

export const GlobalContext = createContext<Config>(null as never)
export const useGlobalContext: () => Config = () => useContext(GlobalContext)

export function renderApp(element: Root, config: Config): void {
	const router = createHashRouter([
		{
			path: '/',
			element: <FoodsPage></FoodsPage>
		}
	])

	element.render(
		<StrictMode>
			<GlobalContext.Provider value={config}>
				<RouterProvider router={router} />
			</GlobalContext.Provider>
		</StrictMode>
	)
}
