import { Context, createContext } from 'react'

import { App } from '@/app/app'

export const AppContext: Context<
	App | undefined
> = createContext<App | undefined>(undefined)
