import * as Context from 'effect/Context'
import type * as Effect from 'effect/Effect'
import type * as Stream from 'effect/Stream'

import type { MessageDispatcher } from '@/app/ports/inbound/message-dispatcher.ts'
import type { Model } from '@/app/ports/inbound/model-emitter/model.ts'
import type { View } from '@/app/ports/outbound/renderer.ts'

export type UiModule = {
	makeUi: Effect.Effect<(model: Model) => View, never, MessageDispatcher>
}

export class UiModuleEmitter extends Context.Service<
	UiModuleEmitter,
	Stream.Stream<UiModule>
>()('d0977ae72dbdd3cf') {}
