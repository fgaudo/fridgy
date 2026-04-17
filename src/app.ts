import * as Browser from '@effect/platform-browser'
import * as Effect from 'effect/Effect'
import * as Stream from 'effect/Stream'

import { Renderer } from '@/app/ports/renderer.ts'
import { ModelEmitter } from '@/app/ports/state-manager/model-emitter/index.ts'
import { UiModuleEmitter } from '@/app/ports/ui-module-emitter.ts'
import { AppLayer } from '@/infra/configuration/app.ts'

Browser.BrowserRuntime.runMain(
	Effect.gen(function* () {
		const render = yield* Renderer
		const uiModule$ = yield* UiModuleEmitter
		const model$ = yield* ModelEmitter
		return yield* model$.pipe(
			Stream.zipLatest(
				uiModule$.pipe(Stream.mapEffect(({ makeUi }) => makeUi)),
			),
			Stream.map(([model, makeView]) => makeView(model)),
			Stream.runForEach(render),
		)
	}).pipe(Effect.provide(AppLayer)),
)
