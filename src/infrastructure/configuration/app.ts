import * as Context from 'effect/Context'
import * as Layer from 'effect/Layer'
import * as References from 'effect/References'

import { MessageDispatcher } from '@/app/ports/state-manager/message-dispatcher.ts'
import * as Usecase from '@/app/use-cases/index.ts'
import * as StateManager from '@/infra/adapters/state-manager.ts'
import { ConfigLayer } from '@/infra/configuration/config.ts'
import { DbLayer } from '@/infra/configuration/db.ts'
import { UiLayer } from '@/infra/configuration/ui.ts'

export const AppLayer = UiLayer.pipe(
	Layer.provideMerge(
		StateManager.layer.pipe(Layer.provide(Usecase.all), Layer.provide(DbLayer)),
	),
	Layer.flatMap(context =>
		Layer.succeedContext(Context.omit(MessageDispatcher)(context)),
	),
	Layer.provide(ConfigLayer),
	Layer.provideMerge(Layer.succeed(References.MinimumLogLevel, 'Debug')),
)
