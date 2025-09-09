import { L } from '$lib/core/imports.ts'

import { useCasesNoDeps } from '../app/use-cases.ts'
import { allImplementations as capacitorImplementations } from './capacitor/index.ts'
import { logger } from './logging/index.ts'
import { allImplementations as mockImplementations } from './mock/index.ts'

const base = L.provide(useCasesNoDeps, logger)

export const capacitor = L.provide(base, capacitorImplementations)

export const mock = L.provide(base, mockImplementations)
