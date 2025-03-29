import { onMount } from 'solid-js'

import {
	F,
	HS,
	NETS,
	NNInt,
	O,
} from '@/core/imports.ts'

import type { App } from '@/app/index.ts'
import type { ProductModel } from '@/app/use-cases/get-sorted-products.ts'

import { onResume } from '@/ui/core/capacitor.ts'
import { useQueueStore } from '@/ui/core/solid.ts'

import { Message } from './actions.ts'
import { reducer } from './reducer.ts'

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
	isRunningRefresh: O.Option<F.Fiber<unknown>>
	isRunningDelete: O.Option<F.Fiber<unknown>>
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
		Message
	>(
		{
			total: NNInt.unsafe_fromNumber(0),
			message: O.none(),
			products: [],
			receivedError: false,
			isLoading: true,
			isRunningRefresh: O.none(),
			selectedProducts: HS.empty(),
			isRunningDelete: O.none(),
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
