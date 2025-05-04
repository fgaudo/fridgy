import { L, pipe } from '$lib/core/imports.ts'

import { useCasesNoDeps } from '../app/use-cases.ts'
import { allImplementations as capacitorImplementations } from './capacitor/index.ts'
import { Deps } from './deps.ts'
import {
	appLogWithLevelLayer,
	logger,
	uiLogWithLevelLayer,
} from './logging/index.ts'
import { allImplementations as mockImplementations } from './mock/index.ts'

const base = pipe(
	useCasesNoDeps,
	L.provide(logger),
	L.provide(appLogWithLevelLayer),
	L.merge(uiLogWithLevelLayer),
)

export const capacitor = pipe(
	base,
	L.provide(capacitorImplementations),
	L.provide(Deps.Default),
)

export const mock = pipe(
	base,
	L.provide(mockImplementations),
	L.provide(Deps.Default),
)
