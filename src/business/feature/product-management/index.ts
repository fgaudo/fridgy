import * as Layer from 'effect/Layer'

import { manager as capacitorDb } from './implementations/capacitor/product-manager.ts'
import { Config } from './implementations/mock/config.ts'
import { manager as mockDb } from './implementations/mock/product-manager.ts'
import * as UC from './usecases/index.ts'

export * as UseCases from './usecases/index.ts'

export * as Rules from './domain/rules.ts'

export const UseCasesWithDeps = {
	capacitor: Layer.provide(UC.all, capacitorDb),
	mock: {
		useCases: Layer.provide(UC.all, mockDb),
		Config: Config,
	},
}
