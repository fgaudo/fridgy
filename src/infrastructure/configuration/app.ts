import * as Layer from 'effect/Layer'

import * as Usecase from '@/app/use-cases/index.ts'
import * as StateManager from '@/infra/adapters/state-manager/index.ts'
import { ConfigLayer } from '@/infra/configuration/config.ts'
import { DbLayer } from '@/infra/configuration/db.ts'
import { UiLayer } from '@/infra/configuration/ui.ts'

export const AppLayer = Layer.mergeAll(
	StateManager.layer.pipe(
		Layer.provideMerge(Usecase.all),
		Layer.provide(DbLayer),
	),
	UiLayer,
).pipe(Layer.provideMerge(ConfigLayer))
