import { type ManagedRuntime } from 'effect/ManagedRuntime'
import { createContext, useContext } from 'react'

import { UseCases } from '@/business/index.ts'

export const FridgyContext = createContext(
	// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
	undefined as ManagedRuntime<UseCases.All, never> | undefined,
)

export const useFridgyContext = () => {
	const context = useContext(FridgyContext)

	if (context === undefined) {
		throw new Error('FridgyContext not found')
	}

	return context
}
