import * as ConfigProvider from 'effect/ConfigProvider'

export const ConfigLayer = ConfigProvider.layer(
	ConfigProvider.fromUnknown({
		ui: {
			emitterWebsocket: {
				// @ts-expect-error
				host: process.env.UI_EMITTER_WEBSOCKET_HOST,
				// @ts-expect-error
				port: process.env.UI_EMITTER_WEBSOCKET_PORT,
			},
			rootSelector: '#root',
			cssLinkSelector: '#css',
			font: {
				comfortaaLatinPath: './comfortaa-latin.woff2',
				comfortaaLatinExtPath: './comfortaa-latin-ext.woff2',
			},
			viewModulePath: './view.js',
		},
		sqlite: {
			workerPath: './sqlite-worker.js',
		},
	}),
)
