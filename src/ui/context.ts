import {
	type Context,
	createContext,
	onCleanup,
	useContext,
} from 'solid-js'

import type { App } from '@/app'

export interface FridgyContext {
	app: App
	showToast: (nessage: string) => void
	showLoading: (show: boolean) => void
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

	onCleanup(() => {
		context.showLoading(false)
	})

	return context
}
