import { C } from '$lib/core/imports.ts';

import { actions as internalActions } from './actions.ts';
import type { InternalReadonlyState } from './state.svelte.ts';

type Actions = {
	[K in keyof typeof internalActions]: ReturnType<
		(typeof internalActions)[K]
	>;
};

export type Store = InternalReadonlyState & {
	actions: Actions;
};

export class StoreService extends C.Tag(
	'ui/Home/Store',
)<StoreService, Store>() {}
