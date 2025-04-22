import {
	C,
	Eff,
	pipe,
} from '$lib/core/imports.ts';

import { actions as internalActions } from './actions.ts';
import {
	type InternalReadonlyState,
	createState,
} from './state.svelte.ts';
import * as internalTasks from './tasks.ts';

type Actions = {
	[K in keyof typeof internalActions]: ReturnType<
		(typeof internalActions)[K]
	>;
};

export class Store extends C.Tag('ui/Home/Store')<
	Store,
	InternalReadonlyState & {
		actions: Actions;
	}
>() {}

export function createStore() {
	const state = createState();

	const actions = {
		disableSelectMode:
			internalActions.disableSelectMode(state),
		fetchListCancelled:
			internalActions.fetchListCancelled(state),
		fetchListFinished:
			internalActions.fetchListFinished(state),
		fetchListStarted:
			internalActions.fetchListStarted(state),
		refreshTime:
			internalActions.refreshTime(state),
		toggleMenu: internalActions.toggleMenu(state),
		toggleItemByHold:
			internalActions.toggleItemByHold(state),
		toggleItemByTap:
			internalActions.toggleItemByTap(state),
	} as Actions;

	const store = {
		state: state.state,
		derived: state.derived,
		actions,
	};

	const tasks = {
		disableSelectMode: pipe(
			internalTasks.disableSelectMode,
			Eff.provideService(Store, store),
		),
		refreshList: pipe(
			internalTasks.refreshList,
			Eff.provideService(Store, store),
		),
		refreshTime: pipe(
			internalTasks.refreshTime,
			Eff.provideService(Store, store),
		),
		refreshTimeInterval: pipe(
			internalTasks.refreshTimeInterval,
			Eff.provideService(Store, store),
		),
		toggleMenu: pipe(
			internalTasks.toggleMenu,
			Eff.provideService(Store, store),
		),
	};

	return {
		state: state.state,
		derived: state.derived,
		tasks,
	};
}
