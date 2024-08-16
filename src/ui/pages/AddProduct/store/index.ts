import { F, O } from '@/core/imports'

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
		name: string
		expirationDate: O.Option<number>
	}
	isOk: boolean
	toastMessage: string
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
			toastMessage: '',
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
