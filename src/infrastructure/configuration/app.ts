import * as Layer from 'effect/Layer'
import * as References from 'effect/References'

import * as Logic from '@/app/core/logic.ts'
import * as Usecase from '@/app/use-cases/index.ts'
import { layer as MessageDispatcherLayer } from '@/infra/adapters/inbound/fsm.adapter.ts'
import { layer as ModelEmitterLayer } from '@/infra/adapters/outbound/fsm.adapter.ts'
import { ConfigLayer } from '@/infra/configuration/config.ts'
import { layer as DbLayer } from '@/infra/configuration/db/adapter.ts'
import { UiLayer } from '@/infra/configuration/ui.ts'
import * as Fsm from '@/shared/fsm.ts'

export const AppLayer = UiLayer.pipe(
	Layer.provide(MessageDispatcherLayer),
	Layer.merge(ModelEmitterLayer),
	Layer.provide(
		Fsm.layer({
			emitter: Logic.subscriptions,
			handleDefect: Logic.handleDefect,
			init: Logic.init,
			update: Logic.update,
		}).pipe(Layer.provide(Usecase.all), Layer.provide(DbLayer)),
	),
	Layer.provide(ConfigLayer),
	Layer.provideMerge(Layer.succeed(References.MinimumLogLevel, 'Debug')),
)
