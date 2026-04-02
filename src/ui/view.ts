import { h } from 'snabbdom'

import * as StateManager from '@/core/state-manager.ts'

import * as Home from './home/slice.ts'

export const view = (
	event: StateManager.Event<Home.State, Home.Message>,
	{ dispatch }: { dispatch: (m: Home.Message) => void },
) => {
	return h('div', { class: { 'text-white text-2xl': true } })
}
