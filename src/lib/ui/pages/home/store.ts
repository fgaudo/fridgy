import { useCases } from '$lib/business/index.ts';

import * as _actions from './internal/actions.ts';
import {
	type InternalReadonlyStore,
	createStore as internalCreateStore,
} from './internal/store.svelte.ts';
import type { Actions } from './internal/tasks.ts';
import * as Tasks from './internal/tasks.ts';

type Tasks = {
	[K in keyof typeof Tasks]: ReturnType<
		(typeof Tasks)[K]
	>;
};

export type Store = InternalReadonlyStore & {
	tasks: Tasks;
};

export function createStore(): Store {
	const store = internalCreateStore();

	const actions = Object.fromEntries(
		Object.entries(_actions).map(([k, fn]) => [
			k,
			fn(store),
		]),
	) as Actions;

	const tasks = Object.fromEntries(
		Object.entries(Tasks).map(([k, fn]) => [
			k,
			fn({ store, actions, useCases }),
		]),
	) as Tasks;

	return {
		state: store.state,
		derived: store.derived,
		tasks,
	};
}
