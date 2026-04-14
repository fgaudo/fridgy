import * as Context from 'effect/Context'
import type * as Stream from 'effect/Stream'
import type { VNode } from 'snabbdom'

import type { Message } from '@/ports/inbound/message-dispatcher'
import type { Model } from '@/ports/outbound/model-emitter/model'

export type View = (
	model: Model,
	{
		dispatch,
	}: {
		dispatch: (m: Message) => void
	},
) => VNode

export class ModuleEmitter extends Context.Service<
	ModuleEmitter,
	Stream.Stream<View>
>()('ce1cbe38c10d4381') {}
