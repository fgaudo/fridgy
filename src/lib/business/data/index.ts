import { pipe } from 'effect/Function'
import * as Layer from 'effect/Layer'

import { useCasesNoDeps } from '../app/use-cases.ts'
import { allImplementations as capacitorImplementations } from './capacitor/index.ts'
import { logger } from './logging/index.ts'
import { allImplementations as mockImplementations } from './mock/index.ts'

const base = pipe(useCasesNoDeps, Layer.provide(logger))

export const capacitor = pipe(base, Layer.provide(capacitorImplementations))

export const mock = pipe(base, Layer.provide(mockImplementations))
