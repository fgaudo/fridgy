import * as ManagedRuntime from 'effect/ManagedRuntime'
import { getContext, setContext } from 'svelte'

import type { UseCases } from '$lib/business/app/use-cases.ts'

const unique: unique symbol = Symbol()

export type GlobalContext = {
	runtime: ManagedRuntime.ManagedRuntime<UseCases, never>
}

export function setGlobalContext(p: GlobalContext): void {
	setContext(unique, p)
}

export function getGlobalContext(): GlobalContext {
	return getContext(unique)
}
