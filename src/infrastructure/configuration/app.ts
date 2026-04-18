import * as Layer from 'effect/Layer'

import * as Usecase from '@/app/use-cases/index.ts'
import * as GetLicenses from '@/infra/adapters/get-licenses/index.ts'
import * as GetSayings from '@/infra/adapters/get-sayings/index.ts'
import * as StateManager from '@/infra/adapters/state-manager.ts'
import { ConfigLayer } from '@/infra/configuration/config.ts'
import { DbLayer } from '@/infra/configuration/db.ts'
import { UiLayer } from '@/infra/configuration/ui.ts'

export const AppLayer = Layer.mergeAll(
	UiLayer,
	GetSayings.layer,
	GetLicenses.layer,
).pipe(
	Layer.provideMerge(
		StateManager.layer.pipe(
			Layer.provideMerge(Usecase.all),
			Layer.provide(DbLayer),
		),
	),
	Layer.provideMerge(ConfigLayer),
)
