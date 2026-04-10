import * as Match from 'effect/Match'
import { h } from 'snabbdom'

import type { Message } from '../messages.ts'
import type * as VM from './state.ts'

export const view = (
	model: VM.Model,
	{ dispatch }: { dispatch: (m: Message) => void },
) => {
	return Match.valueTags(model.productListStatus, {
		Available: () => h('div', 'Available'),
		Empty: () => h('div', 'Empty'),
		Error: () => h('div', 'Error'),
		Initial: () => h('div', 'Initial'),
	})
}
