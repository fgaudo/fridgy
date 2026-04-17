import * as ConfigProvider from 'effect/ConfigProvider'
import * as Layer from 'effect/Layer'
import * as References from 'effect/References'

export const ConfigLayer = ConfigProvider.layer(
	ConfigProvider.fromUnknown({
		// @ts-expect-error
		UI_EMITTER_WEBSOCKET_HOST: process.env.UI_EMITTER_WEBSOCKET_HOST,
		// @ts-expect-error
		UI_EMITTER_WEBSOCKET_PORT: process.env.UI_EMITTER_WEBSOCKET_PORT,
	}),
).pipe(Layer.provideMerge(Layer.succeed(References.MinimumLogLevel, 'Debug')))
