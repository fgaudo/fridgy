import * as Context from 'effect/Context'
import type * as Effect from 'effect/Effect'
import type * as Stream from 'effect/Stream'

import type { View } from '@/app/ports/renderer.ts'
import type { MessageDispatcher } from '@/app/ports/state-manager/message-dispatcher.ts'
import type { Model } from '@/app/ports/state-manager/model-emitter/pages/model.ts'
import type { SplashScreenService } from '@/app/ports/ui/splashscreen-service.ts'
import type { ToastService } from '@/app/ports/ui/toast-service.ts'

export type UiModule = {
	makeUi: Effect.Effect<
		(model: Model) => View,
		never,
		MessageDispatcher | SplashScreenService | ToastService
	>
}

export class UiModuleEmitter extends Context.Service<
	UiModuleEmitter,
	Stream.Stream<UiModule>
>()('269d13d19fc2be6e') {}
