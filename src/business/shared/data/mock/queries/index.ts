import * as Layer from 'effect/Layer'

import { Db } from '@/shared/data/mock/db.ts'

import { query } from './get-sorted-products.ts'

export const implementations = Layer.provide(query, Db.Default)
