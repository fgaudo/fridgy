import * as Layer from 'effect/Layer'

import { queries as capacitorQueries } from './queries/capacitor/index.ts'
import * as Mock from './queries/mock/index.ts'
import * as UC from './usecases/index.ts'

export * as UseCases from './usecases/index.ts'

export * as Rules from './domain/rules.ts'

export const UseCasesWithDeps = {
	capacitor: Layer.provide(UC.all, capacitorQueries),
	mock: {
		useCases: Layer.provide(UC.all, Mock.queries),
		Config: Mock.Config,
	},
}
