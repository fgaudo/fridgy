import {
	type Context,
	createContext,
} from 'solid-js'

import { App } from '@/app'

export const AppContext: Context<
	App<string> | undefined
> = createContext<App<string> | undefined>(
	undefined,
)
