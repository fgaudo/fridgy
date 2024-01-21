import {
	type Context,
	createContext,
} from 'solid-js'

import type { OverviewController } from '@/data'

export const OverviewContext: Context<
	OverviewController | undefined
> = createContext<OverviewController | undefined>(
	undefined,
)

export const AddProductContext: Context<
	OverviewController | undefined
> = createContext<OverviewController | undefined>(
	undefined,
)
