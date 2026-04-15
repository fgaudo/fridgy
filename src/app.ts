import * as Browser from '@effect/platform-browser'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as References from 'effect/References'
import * as Stream from 'effect/Stream'

import * as HotModuleEmitter from '@/adapters/module-emitter/hot.ts'
import * as NoopModuleEmitter from '@/adapters/module-emitter/noop.ts'
import * as SqliteRepo from '@/adapters/product-repo/sqlite.ts'
import * as SnabbdomRenderer from '@/adapters/snabbdom-renderer.ts'
import * as StateManager from '@/adapters/state-manager/default/index.ts'
import { ModelEmitter } from '@/ports/inbound/model-emitter/index.ts'
import { UiModuleEmitter } from '@/ports/inbound/ui-module-emitter.ts'
import { Renderer } from '@/ports/outbound/renderer.ts'
import { all } from '@/use-cases/index.ts'

const root = document.querySelector('#root')!
const css = document.querySelector('#css')!

const useCasesLayer = all.pipe(
	Layer.provide(SqliteRepo.layer('./sqlite-worker.js')),
)

const uiModuleEmitterLayer = (() => {
	if (process.env.NODE_ENV === 'production') {
		return NoopModuleEmitter.layer('./ui.js')
	}
	return HotModuleEmitter.layer({
		modulePath: './ui.js',
		cssLinkElement: css,
	}).pipe(
		Layer.provide(Browser.BrowserSocket.layerWebSocket('ws://localhost:3000')),
	)
})()

Browser.BrowserRuntime.runMain(
	Effect.scoped(
		Effect.gen(function* () {
			const render = yield* Renderer
			const uiModule$ = yield* UiModuleEmitter
			const model$ = yield* ModelEmitter
			return yield* model$.pipe(
				Stream.zipLatestWith(
					uiModule$.pipe(
						Stream.map(({ makeUi }) => makeUi),
						Stream.flattenEffect,
					),
					(model, view) => [model, view] as const,
				),
				Stream.map(([model, view]) => view(model)),
				Stream.runForEach(render),
			)
		}),
	).pipe(
		Effect.provide([
			Layer.succeed(References.MinimumLogLevel, 'Debug'),
			StateManager.layer.pipe(Layer.provideMerge(useCasesLayer)),
			uiModuleEmitterLayer,
			SnabbdomRenderer.layer(root),
		]),
	),
)
