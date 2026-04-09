import * as Match from 'effect/Match'
import { h } from 'snabbdom'

import { mapMessage } from './helpers.ts'
import * as Home from './home/view.ts'
import * as Root from './state.ts'

export const view = (
	model: Root.Model,
	{ dispatch }: { dispatch: (m: Root.Message) => void },
) => {
	return Match.valueTags(model, {
		Home: ({ model }) => Home.view(model, { dispatch: _dispatchHome }),
		AddProduct: () => h('div', { class: { 'text-2xl text-white': true } }, []),
	})
}
