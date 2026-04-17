import * as Config from 'effect/Config'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'

import { rendererLayer } from '@/infra/adapters/renderer.ts'
import { hot, noop } from '@/infra/adapters/ui-module-emitter.ts'
import * as Ui from '@/infra/adapters/ui.ts'

export const UiLayer = Layer.mergeAll(
	Layer.unwrap(
		Effect.gen(function* () {
			const modulePath = './ui.js'
			if (process.env.NODE_ENV === 'production') {
				return noop(modulePath)
			}
			const host = yield* Config.string('UI_EMITTER_WEBSOCKET_HOST')
			const port = yield* Config.number('UI_EMITTER_WEBSOCKET_PORT')
			return hot({
				cssLinkSelector: '#css',
				modulePath,
				webSocketUrl: `ws://${host}:${port.toString(10)}`,
			})
		}),
	).pipe(Layer.orDie),
	rendererLayer({
		rootSelector: '#root',
		comfortaaLatinFontPath: './comfortaa-latin.woff2',
		comfortaaLatinExtFontPath: './comfortaa-latin-ext.woff2',
	}),
	Ui.layer,
)
