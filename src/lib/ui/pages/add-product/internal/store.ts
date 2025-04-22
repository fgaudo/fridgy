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

export class Store extends C.Tag(
	'ui/AddProduct/Store',
)<
	Store,
	InternalReadonlyState & {
		actions: Actions;
	}
>() {}

export function createStore() {
	const state = createState();

	const actions = {
		addingCancelled:
			internalActions.addingCancelled(state),
		addingSucceeded:
			internalActions.addingSucceeded(state),
		addingFailed:
			internalActions.addingFailed(state),
		addingStarted:
			internalActions.addingStarted(state),
		cancelToast:
			internalActions.cancelToast(state),
		initNameIfNotSet:
			internalActions.initNameIfNotSet(state),
		setExpirationDate:
			internalActions.setExpirationDate(state),
		setName: internalActions.setName(state),
	} as Actions;

	const store = {
		state: state.state,
		derived: state.derived,
		actions,
	};

	const tasks = {
		addProduct: pipe(
			internalTasks.addProduct,
			Eff.provideService(Store, store),
		),
		queueResetToast: pipe(
			internalTasks.queueResetToast,
			Eff.provideService(Store, store),
		),
		setExpirationDate: (name: string) =>
			pipe(
				internalTasks.setExpirationDate(name),
				Eff.provideService(Store, store),
			),
		setName: (name: string) =>
			pipe(
				internalTasks.setName(name),
				Eff.provideService(Store, store),
			),

		initNameIfNotSet: pipe(
			internalTasks.initNameIfNotSet,
			Eff.provideService(Store, store),
		),
	};

	return {
		state: state.state,
		derived: state.derived,
		tasks,
	};
}
