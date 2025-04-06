import { onResume } from '$lib/ui/core/capacitor.ts';
import { destructure } from '@solid-primitives/destructure';
import {
	createSignal,
	onCleanup,
	onMount,
} from 'solid-js';
import {
	type SetStoreFunction,
	createStore,
	produce,
} from 'solid-js/store';

import {
	Eff,
	F,
	H,
	HS,
	NETS,
	NNInt,
	O,
} from '$lib/core/imports.ts';

import type { App } from '$lib/app/index.ts';
import {
	GetSortedProductsUseCase,
	type ProductModel,
} from '$lib/app/use-cases/get-sorted-products.ts';

import { Message } from './messages.ts';
import { reducer } from './reducer.ts';

export type ProductUIModel = ProductModel & {
	isSelected: boolean;
};

export interface State {
	total: number;
	message?:
		| {
				type: 'error';
				text: string;
		  }
		| {
				type: 'success';
				text: string;
		  };

	products: ProductUIModel[];
	receivedError: boolean;
	isLoading: boolean;
	selectedProducts: HS.HashSet<string>;
	isRunningRefresh?: F.Fiber<unknown>;
	isRunningDelete?: F.Fiber<unknown>;
}

export type Store = readonly [
	State,
	(command: Message) => void,
];

export const useStore: (
	context: App,
) => Store = context => {
	const [state, setState] = createStore<State>({
		total: NNInt.unsafe_fromNumber(0),
		products: [],
		receivedError: false,
		isLoading: true,
		selectedProducts: HS.empty(),
	});

	xd.message();
	return [
		state,
		{
			refreshList,
		},
	];
};
