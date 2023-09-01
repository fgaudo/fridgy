import { ThemeProvider } from '@material-tailwind/react'
import { StrictMode, createContext, useContext } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider, createHashRouter, redirect } from 'react-router-dom'

import { UseCases } from '@/application'

import { FoodOverview } from './overview'
import { FoodView } from './view'

interface Config {
	readonly useCases: UseCases
	readonly title: string
}

export const GlobalContext = createContext<Config>(null as never)
export const useGlobalContext: () => Config = () => useContext(GlobalContext)

export function renderApp(element: HTMLElement, config: Config): void {
	const router = createHashRouter([
		{
			path: '/',
			loader: () => redirect('/foods')
		},
		{
			path: 'foods',
			children: [
				{
					index: true,
					element: <FoodOverview></FoodOverview>
				},
				{
					path: ':id',
					element: <FoodView></FoodView>
				}
			]
		}
	])

	const root = createRoot(element)

	root.render(
		<StrictMode>
			<ThemeProvider>
				<GlobalContext.Provider value={config}>
					<RouterProvider router={router} />
				</GlobalContext.Provider>
			</ThemeProvider>
		</StrictMode>
	)
}
