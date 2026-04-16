import * as Context from 'effect/Context'
import type * as Effect from 'effect/Effect'
import type * as Stream from 'effect/Stream'

import type { MessageDispatcher } from '@/ports/inbound/message-dispatcher.ts'
import type { Model } from '@/ports/inbound/model-emitter/model.ts'
import type { HtmlView } from '@/ports/outbound/renderer.ts'

export type UiModule = {
	makeUi: Effect.Effect<(model: Model) => HtmlView, never, MessageDispatcher>
}

export class UiModuleEmitter extends Context.Service<
	UiModuleEmitter,
	Stream.Stream<UiModule>
>()('a2e5494cd9706a7d') {}
