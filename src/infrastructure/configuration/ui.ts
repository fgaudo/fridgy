import * as Config from 'effect/Config'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'

import {
	hotRendererLayer,
	coldRendererLayer,
} from '@/infra/adapters/renderer/index.ts'

export const UiLayer = Layer.unwrap(
	Effect.gen(function* () {
		const rootSelector = '#root'
		const comfortaaLatinExtFontPath = './comfortaa-latin-ext.woff2'
		const comfortaaLatinFontPath = './comfortaa-latin.woff2'
		if (process.env.NODE_ENV === 'production') {
			return coldRendererLayer({
				rootSelector,
				comfortaaLatinExtFontPath,
				comfortaaLatinFontPath,
			})
		}
		const host = yield* Config.string('UI_EMITTER_WEBSOCKET_HOST')
		const port = yield* Config.number('UI_EMITTER_WEBSOCKET_PORT')
		return hotRendererLayer({
			comfortaaLatinExtFontPath: './comfortaa-latin-ext.woff2',
			comfortaaLatinFontPath: './comfortaa-latin.woff2',
			rootSelector: '#root',
			cssLinkSelector: '#css',
			modulePath: './view.js',
			webSocketUrl: `ws://${host}:${port.toString(10)}`,
		})
	}),
)
