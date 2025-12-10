import * as Layer from 'effect/Layer'

import { layer as inMemoryProductRepositoryLayer } from './repository/in-memory/product-repository.ts'
import { layer as sqlProductRepositoryLayer } from './repository/sql/product-repository.ts'
import * as UC from './usecase/index.ts'

export * as UseCasesWithoutDependencies from './usecase/index.ts'

export const UseCases = {
	sql: Layer.provide(UC.all, sqlProductRepositoryLayer),
	inMemory: (config: Parameters<typeof inMemoryProductRepositoryLayer>[0]) =>
		Layer.provide(UC.all, inMemoryProductRepositoryLayer(config)),
}
