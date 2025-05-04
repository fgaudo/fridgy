import {
	Eff,
	L,
	pipe,
} from '$lib/core/imports.ts'

import { LogWithLevel } from '$lib/business/app/queries.ts'

export const appLogWithLevelLayer = L.succeed(
	LogWithLevel.LogWithLevel,
	(...args) =>
		pipe(
			Eff.logWithLevel(...args),
			Eff.annotateLogs('_LAYER_', 'A'),
		),
)
