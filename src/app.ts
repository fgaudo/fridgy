import * as Browser from '@effect/platform-browser'
import * as Effect from 'effect/Effect'
import * as Stream from 'effect/Stream'

import { Renderer } from '@/app/ports/renderer.ts'
import { ModelEmitter } from '@/app/ports/state-manager/model-emitter.ts'
import { AppLayer } from '@/infra/configuration/app.ts'

Browser.BrowserRuntime.runMain(
	Effect.gen(function* () {
		const render = yield* Renderer
		const model$ = yield* ModelEmitter
		return yield* model$.pipe(Stream.switchMap(render), Stream.runDrain)
	}).pipe(Effect.provide(AppLayer)),
)
