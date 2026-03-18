import * as Layer from 'effect/Layer'

import * as Adapters from '@/adapters/index.ts'
import * as UseCases from '@/use-cases/index.ts'

export * as UseCase from '@/use-cases/index.ts'

export const UseCaseWithDeps = {
	sql: Layer.provide(UseCases.all, Adapters.sql),
	inMemory: Layer.provide(UseCases.all, Adapters.inMemory),
}
