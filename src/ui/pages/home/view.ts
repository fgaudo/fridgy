import * as Match from 'effect/Match'
import { h } from 'snabbdom'

import type { Message } from '../messages.ts'
import type * as VM from './state.ts'

export const view = (
	model: VM.Model,
	{ dispatch }: { dispatch: (m: Message) => void },
) => {
	return h('div', [
		h(
			'div',
			{
				props: {
					className:
						'h-14 bottom-0 text-on-background flex items-center fixed w-full',
				},
			},
			h('div', { props: { className: 'font-extrabold' } }, 'fridgy'),
		),
		h(
			'div',
			{ props: { className: '' } },
			Match.valueTags(model.productListStatus, {
				Available: () => h('div', 'Available'),
				Empty: () => h('div', 'Empty'),
				Error: () => h('div', 'Error'),
				Initial: () => h('div', 'Initial'),
			}),
		),
	])
}
