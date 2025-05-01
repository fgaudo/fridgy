import { C } from '$lib/core/imports.ts'
import {
	type Store as _Store,
	createStore as _createStore,
} from '$lib/core/store.ts'

import * as Actions from './actions.ts'
import {
	type StateContext,
	createStateContext,
} from './state.svelte.ts'

export type Store = _Store<
	{
		state: StateContext['state']
		derived: StateContext['derived']
	},
	typeof Actions
>

export class Service extends C.Tag(
	'ui/Home/Store',
)<Service, Store>() {}

export function createStore(): Store {
	const context = createStateContext()

	return _createStore(
		{
			state: context.state,
			derived: context.derived,
		},
		Actions,
	)
}
