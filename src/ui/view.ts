import { h } from 'snabbdom'

import * as Home from './home/state.ts'
import * as Root from './state.ts'

export const view = (
	event: Root.Model,
	{ dispatch }: { dispatch: (m: Root.Message) => void },
) => {
	const dispatchHomeMessage = (message: Home.Message) => {
		dispatch(Root.Message.GotHomeMsg({ message }))
	}

	return h('div', { props: { class: 'text-white text-2xl' } })
}
