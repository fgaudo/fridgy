import { getContext, setContext } from 'svelte'

import type { MR } from '$lib/core/imports.ts'

import type { UseCases } from '$lib/business/app/use-cases.ts'

const unique: unique symbol = Symbol()

export type GlobalContext = {
	runtime: MR.ManagedRuntime<UseCases, never>
}

export function setGlobalContext(p: GlobalContext): void {
	setContext(unique, p)
}

export function getGlobalContext(): GlobalContext {
	return getContext(unique)
}
