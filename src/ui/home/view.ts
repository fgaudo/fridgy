import { defineCustomElements } from '@ionic/pwa-elements/loader'
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
					className: 'bg-secondary h-14 text-on-background flex items-center',
				},
			},
			'asddsa123213',
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
