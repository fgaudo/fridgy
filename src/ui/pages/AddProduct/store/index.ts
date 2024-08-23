import { produce } from 'solid-js/store'

import {
	F,
	Int,
	NETS,
	O,
	pipe,
} from '@/core/imports'

import type { App } from '@/app'

import { useQueueStore } from '@/ui/core/solid-js'

import {
	InternalMessage,
	Message,
} from './actions'
import {
	defaultFields,
	validateFieldsMutation,
} from './mutations'
import { reducer } from './reducer'

export interface State {
	formFields: {
		name: string
		expirationDate: O.Option<Int.Integer>
	}
	isOk: boolean
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
	runningAddProduct: O.Option<F.Fiber<unknown>>
}

export type Store = [
	State,
	(message: Message) => void,
]

export const createStore: (
	app: App,
) => Store = context => {
	const [state, dispatch] = useQueueStore<
		State,
		Message | InternalMessage
	>(
		pipe(
			{
				formFields: defaultFields(),
				message: O.none(),
				runningAddProduct: O.none(),
				isOk: false,
			},
			produce(
				validateFieldsMutation(defaultFields()),
			),
		),
		reducer(context),
	)

	return [
		state,
		dispatch as (message: Message) => void,
	]
}
