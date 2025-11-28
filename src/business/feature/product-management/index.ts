import * as Layer from 'effect/Layer'

import {
	Config,
	layerWithoutDependencies as mockProductRepositoryLayer,
} from './repository/mock/product-repository.ts'
import { layer as sqliteCapacitorProductRepositoryLayer } from './repository/sqlite-capacitor/product-repository.ts'
import * as UC from './usecase/index.ts'

export * as UseCasesWithoutDependencies from './usecase/index.ts'

export const UseCases = {
	capacitor: Layer.provide(UC.all, sqliteCapacitorProductRepositoryLayer),
	mock: {
		useCases: Layer.provide(UC.all, mockProductRepositoryLayer),
		Config,
	},
}
