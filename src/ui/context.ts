import {
	type Context,
	createContext,
} from 'solid-js'

import type { App } from '@/app'

export const AppContext: Context<
	App | undefined
> = createContext<App | undefined>(undefined)
