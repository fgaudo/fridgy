import { L, pipe } from '$lib/core/imports.ts'

import { useCasesNoDeps } from '../app/use-cases.ts'
import { allImplementations as capacitorImplementations } from './capacitor/index.ts'
import { logger } from './logging/index.ts'
import { allImplementations as mockImplementations } from './mock/index.ts'

const base = pipe(useCasesNoDeps, L.provide(logger))

export const capacitor = pipe(base, L.provide(capacitorImplementations))

export const mock = pipe(base, L.provide(mockImplementations))
