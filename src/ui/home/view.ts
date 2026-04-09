import { Toast } from '@capacitor/toast'
import * as Effect from 'effect/Effect'
import * as Match from 'effect/Match'
import { h } from 'snabbdom'

import { Message } from '../messages.ts'
import type * as VM from './state.ts'

export const onRender = Match.type<Message>().pipe(
	Match.when(Message.$is('Home_DeleteAndRefreshFailed'), () =>
		Effect.promise(() => Toast.show({ text: 'Could not delete' })),
	),
	Match.when(Message.$is('Home_DeleteSucceededButRefreshFailed'), () =>
		Effect.promise(() => Toast.show({ text: 'Could not refresh' })),
	),
	Match.orElse(event => Effect.logWarning('Ignored impurity', event)),
)

export const view = (
	model: VM.Model,
	{ dispatch }: { dispatch: (m: Message) => void },
) => {
	return Match.valueTags(model.productListStatus, {
		Available: () => h('div'),
		Empty: () => h('div'),
		Error: () => h('div'),
		Initial: () => h('div'),
	})
}
