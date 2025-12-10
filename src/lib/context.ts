import { type ManagedRuntime } from 'effect/ManagedRuntime'
import { createContext, useContext } from 'react'

import { UseCasesWithoutDependencies } from '../business'

export const FridgyContext = createContext(
	undefined as
		| ManagedRuntime<UseCasesWithoutDependencies.All, never>
		| undefined,
)

export const useFridgyContext = () => {
	const context = useContext(FridgyContext)

	if (!context) {
		throw new Error('FridgyContext not found')
	}

	return context
}
