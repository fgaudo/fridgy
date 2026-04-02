import * as Layer from 'effect/Layer'

import * as Sql from '@/adapters/sql/index.ts'
import * as UseCases from '@/use-cases/index.ts'

export const sql = Layer.provide(UseCases.all, Sql.layer)
