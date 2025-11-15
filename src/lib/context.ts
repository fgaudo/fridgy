import { getContext, setContext } from 'svelte'

import type { runtime } from '../business/index.ts'

const unique: unique symbol = Symbol()

export type GlobalContext = {
	runtime: typeof runtime
}

export function setGlobalContext(p: GlobalContext): void {
	setContext(unique, p)
}

export function getGlobalContext(): GlobalContext {
	return getContext(unique)
}
