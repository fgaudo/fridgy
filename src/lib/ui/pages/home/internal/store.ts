import { C } from '$lib/core/imports.ts'
import {
	type Store as _Store,
	createStore as _createStore,
} from '$lib/core/store.ts'

import { actions as internalActions } from './actions.ts'
import {
	type StateContext,
	createStateContext,
} from './state.svelte.ts'

export type Store = _Store<
	{
		state: StateContext['state']
		derived: StateContext['derived']
	},
	typeof internalActions
>

export class StoreService extends C.Tag(
	'ui/Home/Store',
)<StoreService, Store>() {}

export function createStore(): Store {
	const context = createStateContext()

	return _createStore(
		{
			state: context.state,
			derived: context.derived,
		},
		internalActions,
	)
}
