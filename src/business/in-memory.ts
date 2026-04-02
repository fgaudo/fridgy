import * as Layer from 'effect/Layer'

import * as InMemory from '@/adapters/in-memory/index.ts'
import * as UseCases from '@/use-cases/index.ts'

export const inMemory = Layer.provide(UseCases.all, InMemory.layer)
