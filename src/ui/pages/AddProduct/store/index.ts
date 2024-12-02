import { produce } from 'solid-js/store'

import {
	F,
	Int,
	NETS,
	O,
	pipe,
} from '@/core/imports.ts'

import type { App } from '@/app/index.ts'

import { useQueueStore } from '@/ui/core/solid.ts'

import {
	InternalMessage,
	Message,
} from './actions.ts'
import { reducer } from './reducer.ts'

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
				formFields: {
					name: '',
					expirationDate: O.none(),
				},

				message: O.none(),
				runningAddProduct: O.none(),
				isOk: false,
			},
			produce((state: State) => {
				state.isOk = NETS.fromString('').pipe(
					O.isSome,
				)
			}),
		),
		reducer(context),
	)

	return [state, dispatch]
}
