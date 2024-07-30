import {
	type Context,
	createContext,
	useContext,
} from 'solid-js'

import type { App } from '@/app'

export interface FridgyContext {
	app: App
}

export const AppContext: Context<
	FridgyContext | undefined
> = createContext<FridgyContext | undefined>(
	undefined,
)

export const useAppContext = (
	appContext: Context<FridgyContext | undefined>,
): FridgyContext => {
	const context = useContext(appContext)!

	return context
}
