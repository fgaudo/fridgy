import { getContext, setContext } from 'svelte';

import { type Dependencies } from '$lib/app';

const key: unique symbol = Symbol();

export function setGlobalContext(context: {
	app: Dependencies;
}) {
	setContext(key, context);
}

export function getGlobalContext() {
	return getContext(key) as { app: Dependencies };
}
