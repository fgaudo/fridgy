import * as Browser from '@effect/platform-browser'
import * as Config from 'effect/Config'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'

export const UiEmitterLayer = Layer.unwrap(
	Effect.gen(function* () {
		const uiModulePath = yield* Config.string('UI_MODULE_PATH')
		if (process.env.NODE_ENV === 'production') {
			const Noop = yield* Effect.promise(
				() => import('@/infra/adapters/ui-module-emitter/noop'),
			)
			return Noop.layer(uiModulePath)
		}
		const Hot = yield* Effect.promise(
			() => import('@/infra/adapters/ui-module-emitter/hot'),
		)
		const cssLinkSelector = yield* Config.string('CSS_LINK_SELECTOR')
		const url = yield* Config.string('UI_EMITTER_WEBSOCKET_URL')
		return Hot.layer({
			modulePath: uiModulePath,
			cssLinkSelector: cssLinkSelector,
		}).pipe(Layer.provide(Browser.BrowserSocket.layerWebSocket(url)))
	}),
).pipe(Layer.orDie)
