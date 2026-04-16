import * as Layer from 'effect/Layer'

import * as UC from '@/app/use-cases/index.ts'
import * as SnabbdomRenderer from '@/infra/adapters/snabbdom-renderer.ts'
import * as StateManager from '@/infra/adapters/state-manager/default/index.ts'
import { ConfigLayer } from '@/infra/configuration/config.ts'
import { DbLayer } from '@/infra/configuration/db.ts'
import { UiEmitterLayer } from '@/infra/configuration/ui.ts'

export const AppLayer = Layer.mergeAll(
	SnabbdomRenderer.layer,
	StateManager.layer.pipe(Layer.provideMerge(UC.all), Layer.provide(DbLayer)),
	UiEmitterLayer,
).pipe(Layer.provide(ConfigLayer))
