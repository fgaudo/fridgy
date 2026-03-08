import * as Layer from 'effect/Layer'

import * as Adapters from '@/adapters/index.ts'
import * as UseCases from '@/use-cases/index.ts'

export * as UseCases from '@/use-cases/index.ts'

export const sql = Layer.provide(UseCases.all, Adapters.sql)
export const inMemory = Layer.provide(UseCases.all, Adapters.inMemory)
