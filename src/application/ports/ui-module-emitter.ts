import * as Context from 'effect/Context'
import type * as Effect from 'effect/Effect'
import type * as Stream from 'effect/Stream'

import type { Model } from '@/app/model/root.ts'

export type UiModule = {
	makeUi: (model: Model) => Effect.Effect<void>
}

export class UiModuleEmitter extends Context.Service<
	UiModuleEmitter,
	Stream.Stream<UiModule>
>()('269d13d19fc2be6e') {}
