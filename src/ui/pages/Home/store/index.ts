import type { FiberId } from 'effect/FiberId'
import { onMount } from 'solid-js'

import { HS, O } from '@/core/imports'

import type { App } from '@/app'
import type { ProductModel } from '@/app/use-cases/get-sorted-products'

import { onResume } from '@/ui/core/capacitor'
import { useQueueStore } from '@/ui/core/solid-js'

import {
	InternalMessage,
	Message,
} from './actions'
import { reducer } from './reducer'

export interface State {
	total: number
	toastMessage: string
	products: ProductModel[]
	isLoading: boolean
	selectedProducts: HS.HashSet<string>
	refreshingId: O.Option<FiberId>
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
			total: 0,
			toastMessage: '',
			products: [],
			isLoading: true,
			refreshingId: O.none(),
			selectedProducts: HS.empty(),
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
