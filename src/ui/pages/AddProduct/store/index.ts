import * as Sol from 'solid-js'

import { FId, O } from '@/core/imports'

import type { App } from '@/app'

import { onResume } from '@/ui/core/capacitor'
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
	currentDate: O.Option<string>
	toastId: O.Option<FId.FiberId>
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
			currentDate: O.none(),
			toastMessage: '',
			toastId: O.none(),
			...validateFields(defaultFields()),
		},
		reducer(context),
	)

	Sol.onMount(() => {
		onResume(() => {
			dispatch(InternalMessage.RefreshDate())
		})

		dispatch(InternalMessage.RefreshDate())
	})

	return [
		state,
		dispatch as (message: Message) => void,
	]
}
