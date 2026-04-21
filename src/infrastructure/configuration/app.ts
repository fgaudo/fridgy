import * as ConfigProvider from 'effect/ConfigProvider'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as References from 'effect/References'

import * as Usecase from '@/app/use-cases/index.ts'
import { layer as FsmDispatcherLayer } from '@/infra/adapters/inbound/fsm.adapter.ts'
import { layer as FsmEmitterLayer } from '@/infra/adapters/outbound/fsm.adapter.ts'
import * as Sql from '@/infra/adapters/outbound/sql/adapter.ts'
import * as GetLicenses from '@/infra/adapters/outbound/static/licenses/adapter.ts'
import * as GetSayings from '@/infra/adapters/outbound/static/sayings/adapter.ts'
import {
	hotLayer,
	staticLayer,
} from '@/infra/adapters/outbound/web-snabbdom/adapter.ts'
import * as Fsm from '@/infra/shared/fsm.ts'
import * as SqlHelper from '@/infra/shared/sql/sql-helper.ts'
import * as Sqlite from '@/infra/shared/sqlite/layer.ts'

const UiLayer = Layer.unwrap(
	Effect.gen(function* () {
		if (process.env.NODE_ENV === 'production') {
			return staticLayer
		}
		return hotLayer
	}),
).pipe(Layer.provide([GetSayings.layer, GetLicenses.layer]))

const ConfigLayer = ConfigProvider.layer(
	ConfigProvider.fromUnknown({
		sqlite: {
			workerPath: './sqlite-worker.js',
		},
		ui: {
			font: {
				comfortaaLatinExtPath: './comfortaa-latin-ext.woff2',
				comfortaaLatinPath: './comfortaa-latin.woff2',
			},
			hotModule: {
				viewPath: './view.js',
				websocket: {
					// @ts-expect-error
					host: process.env.UI_EMITTER_WEBSOCKET_HOST,
					// @ts-expect-error
					port: process.env.UI_EMITTER_WEBSOCKET_PORT,
				},
			},
		},
	}),
)

const DbLayer = Sql.layer.pipe(
	Layer.provide(SqlHelper.SqlHelper.layer),
	Layer.provide(Sqlite.layer),
)

export const AppLayer = UiLayer.pipe(
	Layer.provide(FsmDispatcherLayer),
	Layer.merge(FsmEmitterLayer),
	Layer.provide(
		Fsm.layer.pipe(Layer.provide(Usecase.all), Layer.provide(DbLayer)),
	),
	Layer.provide(ConfigLayer),
	Layer.provideMerge(Layer.succeed(References.MinimumLogLevel, 'Debug')),
)
