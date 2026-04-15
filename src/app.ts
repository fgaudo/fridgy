import * as Browser from '@effect/platform-browser'
import * as Effect from 'effect/Effect'
import * as FiberSet from 'effect/FiberSet'
import * as Layer from 'effect/Layer'
import * as References from 'effect/References'
import * as Stream from 'effect/Stream'

import * as HotModuleEmitter from '@/adapters/module-emitter/hot.ts'
import * as SqliteRepo from '@/adapters/product-repo/sqlite.ts'
import * as SnabbdomRenderer from '@/adapters/snabbdom-renderer.ts'
import * as StateManager from '@/adapters/state-manager/default/index.ts'
import type { Message } from '@/ports/inbound/message-dispatcher.ts'
import { MessageDispatcher } from '@/ports/inbound/message-dispatcher.ts'
import { UiModuleEmitter } from '@/ports/inbound/ui-module-emitter.ts'
import { ModelEmitter } from '@/ports/outbound/model-emitter/index.ts'
import { Renderer } from '@/ports/outbound/renderer.ts'
import { all } from '@/use-cases/index.ts'

const root = document.querySelector('#root')!
const css = document.querySelector('#css')!

const useCasesLayer = all.pipe(
	Layer.provide(SqliteRepo.layer('./sqlite-worker.js')),
)

Browser.BrowserRuntime.runMain(
	Effect.gen(function* () {
		const render = yield* Renderer
		const module$ = yield* UiModuleEmitter
		const messageDispatcher = yield* MessageDispatcher
		const model$ = yield* ModelEmitter
		const run = yield* FiberSet.makeRuntimePromise()
		const dispatch = (message: Message) => {
			void run(messageDispatcher(message))
		}
		yield* model$.pipe(
			Stream.zipLatestWith(
				module$,
				(model, module) => [model, module] as const,
			),
			Stream.map(([model, { view }]) => view(model, { dispatch })),
			Stream.runForEach(render),
		)
	}).pipe(
		Effect.scoped,
		Effect.provide([
			Layer.succeed(References.MinimumLogLevel, 'Debug'),
			StateManager.layer.pipe(Layer.provideMerge(useCasesLayer)),
			HotModuleEmitter.layer({
				modulePath: './view.js',
				cssLinkElement: css,
			}).pipe(
				Layer.provide(
					Browser.BrowserSocket.layerWebSocket('ws://localhost:3000'),
				),
			),
			SnabbdomRenderer.layer(root),
		]),
	),
)
