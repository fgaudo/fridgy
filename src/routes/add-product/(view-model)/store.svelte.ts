import { C, Eff, L } from '$lib/core/imports.ts'
import {
	type Store as _Store,
	createStore as _createStore,
} from '$lib/core/store.ts'

import { mutations } from './mutations.ts'
import { type State } from './state.svelte.ts'

export type Store = _Store<
	State,
	ReturnType<typeof mutations>
>

export class Service extends C.Tag(
	'ui/AddProduct/Store',
)<Service, Store>() {}

export function createStoreService(state: State) {
	return L.succeedContext(
		C.make(
			Service,
			_createStore(
				Eff.sync(() => $state.snapshot(state)),
				mutations(state),
			),
		),
	)
}
