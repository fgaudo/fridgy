import * as ConfigProvider from 'effect/ConfigProvider'

export const ConfigLayer = ConfigProvider.layer(
	ConfigProvider.fromUnknown({
		// @ts-expect-error
		ROOT_ELEMENT_SELECTOR: process.env.ROOT_ELEMENT_SELECTOR,
		// @ts-expect-error
		UI_MODULE_PATH: process.env.UI_MODULE_PATH,
		// @ts-expect-error
		CSS_LINK_SELECTOR: process.env.CSS_LINK_SELECTOR,
		// @ts-expect-error
		UI_EMITTER_WEBSOCKET_URL: process.env.UI_EMITTER_WEBSOCKET_URL,
		// @ts-expect-error
		SQLITE_WORKER_PATH: process.env.SQLITE_WORKER_PATH,
	}),
)
