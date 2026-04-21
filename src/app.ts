import * as Browser from '@effect/platform-browser'
import * as Effect from 'effect/Effect'

import { ModelEmitter } from '@/app/ports/outbound/model-emitter.ts'
import { Renderer } from '@/app/ports/outbound/model-renderer.ts'
import { AppLayer } from '@/infra/configuration/app.ts'

Browser.BrowserRuntime.runMain(
	Effect.gen(function* () {
		const render = yield* Renderer
		const model$ = yield* ModelEmitter
		return yield* render(model$).pipe(Effect.tapCause(Effect.logFatal))
	}).pipe(Effect.provide(AppLayer)),
)
