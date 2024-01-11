import { Context, createContext } from 'solid-js'

import { App } from '@/app'

export const AppContext: Context<
	App | undefined
> = createContext<App | undefined>(undefined)
