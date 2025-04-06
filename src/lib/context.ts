import { getContext, setContext } from 'svelte';

import { type UseCases } from '$lib/app/use-cases.ts';

const key: unique symbol = Symbol();

export function setGlobalContext(context: {
	app: UseCases;
}) {
	setContext(key, context);
}

export function getGlobalContext() {
	return getContext(key) as { app: UseCases };
}
