import { getContext, setContext } from 'svelte'

import type { UseCases } from '$lib/business/app/use-cases.ts'

const key: unique symbol = Symbol()

export function setUsecasesContext(
	useCases: UseCases,
) {
	setContext(key, useCases)
}

export function getUsecasesContext() {
	return getContext(key) as UseCases
}
