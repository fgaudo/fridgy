import { onMount } from 'solid-js'

import {
	F,
	HS,
	NETS,
	NNInt,
	O,
} from '@/core/imports.js'

import type { App } from '@/app/index.js'
import type { ProductModel } from '@/app/use-cases/get-sorted-products.js'

import { onResume } from '@/ui/core/capacitor.js'
import { useQueueStore } from '@/ui/core/solid.js'

import {
	InternalMessage,
	Message,
} from './actions.js'
import { reducer } from './reducer.js'

export interface State {
	total: NNInt.NonNegativeInteger
	message: O.Option<
		| {
				type: 'error'
				text: NETS.NonEmptyTrimmedString
		  }
		| {
				type: 'success'
				text: NETS.NonEmptyTrimmedString
		  }
	>
	products: ProductModel[]
	receivedError: boolean
	isLoading: boolean
	selectedProducts: HS.HashSet<string>
	runningRefreshing: O.Option<F.Fiber<unknown>>
	runningDeleting: O.Option<F.Fiber<unknown>>
}

export type Store = readonly [
	State,
	(command: Message) => void,
]

export const createStore: (
	context: App,
) => Store = context => {
	const [state, dispatch] = useQueueStore<
		State,
		Message | InternalMessage
	>(
		{
			total: NNInt.unsafe_fromNumber(0),
			message: O.none(),
			products: [],
			receivedError: false,
			isLoading: true,
			runningRefreshing: O.none(),
			selectedProducts: HS.empty(),
			runningDeleting: O.none(),
		},
		reducer(context),
	)

	onMount(() => {
		onResume(() => {
			dispatch(Message.RefreshList())
		})

		dispatch(Message.RefreshList())
	})

	return [state, dispatch]
}
