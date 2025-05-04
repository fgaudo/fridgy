import {
	Eff,
	L,
	pipe,
} from '$lib/core/imports.ts'

import { UiLogWithLevel } from '$lib/business/app/queries.ts'

export const uiLogWithLevelLayer = L.succeed(
	UiLogWithLevel.UiLogWithLevel,
	(...args) =>
		pipe(
			Eff.logWithLevel(...args),
			Eff.annotateLogs('_LAYER_', 'U'),
		),
)
