import * as Layer from 'effect/Layer'

import { layer as capacitorProductManager } from './implementations/capacitor/product-manager.ts'
import { Service } from './implementations/mock/config.ts'
import { layerWithoutDependencies as mockDb } from './implementations/mock/product-manager.ts'
import * as UC from './usecases/index.ts'

export * as UseCasesWithoutDependencies from './usecases/index.ts'

export const UseCases = {
	capacitor: Layer.provide(UC.all, capacitorProductManager),
	mock: {
		useCases: Layer.provide(UC.all, mockDb),
		Config: Service,
	},
}
