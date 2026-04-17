import * as Config from 'effect/Config'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'

import { uiHotLayer, uiLayer } from '@/infra/adapters/ui.ts'

export const UiLayer = Layer.unwrap(
	Effect.gen(function* () {
		const comfortaaLatinFontPath = './comfortaa-latin.woff2'
		const comfortaaLatinExtFontPath = './comfortaa-latin-ext.woff2'
		const rootSelector = '#root'
		const uiModulePath = './ui.js'
		if (process.env.NODE_ENV === 'production') {
			return uiLayer({
				comfortaaLatinExtFontPath,
				comfortaaLatinFontPath,
				rootSelector,
				uiModulePath,
			})
		}
		const host = yield* Config.string('UI_EMITTER_WEBSOCKET_HOST')
		const port = yield* Config.number('UI_EMITTER_WEBSOCKET_PORT')

		return uiHotLayer({
			cssLinkSelector: '#css',
			comfortaaLatinExtFontPath,
			comfortaaLatinFontPath,
			rootSelector,
			uiModulePath,
			webSocketUrl: `ws://${host}:${port.toString(10)}`,
		})
	}),
).pipe(Layer.orDie)
