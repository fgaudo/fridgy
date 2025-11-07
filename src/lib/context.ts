import { getContext, setContext } from 'svelte'

import type { UseCases } from '../business/app/use-cases.ts'
import type { Executor } from './executor.ts'

const unique: unique symbol = Symbol()

export type GlobalContext = {
	executor: Executor<UseCases>
}

export function setGlobalContext(p: GlobalContext): void {
	setContext(unique, p)
}

export function getGlobalContext(): GlobalContext {
	return getContext(unique)
}
