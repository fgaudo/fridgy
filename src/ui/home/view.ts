import * as Match from 'effect/Match'
import { h } from 'snabbdom'

import type * as VM from './state.ts'

export const view = (model: VM.Model, _dispatch: (m: VM.Message) => void) => {
	return Match.valueTags(model.productListStatus, {
		Available: () => h('div'),
		Empty: () => h('div'),
		Error: () => h('div'),
		Initial: () => h('div'),
	})
}
