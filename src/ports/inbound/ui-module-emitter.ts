import * as Context from 'effect/Context'
import type * as Stream from 'effect/Stream'
import type { VNode } from 'snabbdom'

import type { Message } from '@/ports/inbound/message-dispatcher.ts'
import type { Model } from '@/ports/inbound/model-emitter/model'

export type Module = {
	view: (
		model: Model,
		p: {
			dispatch: (m: Message) => void
		},
	) => VNode
}

export class UiModuleEmitter extends Context.Service<
	UiModuleEmitter,
	Stream.Stream<Module>
>()('a2e5494cd9706a7d') {}
