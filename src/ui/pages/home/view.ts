import * as Match from 'effect/Match'
import { h } from 'snabbdom'

import type { Message } from '@/ports/inbound/message-dispatcher'
import type { Model } from '@/ports/inbound/model-emitter/home/model'

export const view = (
	model: Model,
	{ dispatch }: { dispatch: (m: Message) => void },
) => {
	return h('div', { props: { className: 'bg-red-300' } }, [
		h(
			'div',
			{
				props: {
					className:
						'h-14 bottom-0 text-on-background flex items-center fixed w-full',
				},
			},
			h(
				'div',
				{ props: { className: 'font-extrabold font-stylish' } },
				'112221fridgy!!!!!',
			),
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
