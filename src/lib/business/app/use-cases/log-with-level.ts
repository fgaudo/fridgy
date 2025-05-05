import { type LogLevel } from 'effect'
import type { RequestResolver } from 'effect/RequestResolver'

import { C, R } from '$lib/core/imports.ts'

interface Request extends R.Request<void> {
	readonly _tag: 'UiLogWithLevels'
	readonly level: LogLevel.LogLevel
	readonly message: ReadonlyArray<unknown>
	readonly annotations?: Record<string, unknown>
}

export const Request = R.tagged<Request>(
	'UiLogWithLevels',
)

export class Resolver extends C.Tag(
	'app/useCases/LogWithLevelsResolver',
)<Resolver, RequestResolver<Request>>() {}
