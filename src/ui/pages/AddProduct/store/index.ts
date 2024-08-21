import { F, Int, O } from '@/core/imports'
import * as NETS from '@/core/non-empty-trimmed-string'

import type { App } from '@/app'

import { useQueueStore } from '@/ui/core/solid-js'

import {
	InternalMessage,
	Message,
} from './actions'
import {
	defaultFields,
	reducer,
	validateFields,
} from './reducer'

export interface State {
	formFields: {
		name: O.Option<NETS.NonEmptyTrimmedString>
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
	runningRemoveToast: O.Option<F.Fiber<unknown>>
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
		{
			formFields: defaultFields(),
			message: O.none(),
			runningRemoveToast: O.none(),
			runningAddProduct: O.none(),
			...validateFields(defaultFields()),
		},
		reducer(context),
	)

	return [
		state,
		dispatch as (message: Message) => void,
	]
}
