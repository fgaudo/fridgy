import { LogLevel } from 'effect'
import type { RequestResolver } from 'effect/RequestResolver'

import { C, R } from '$lib/core/imports.ts'

interface Request extends R.Request<void> {
	readonly _tag: 'LogWithLevels'
	readonly level: LogLevel.LogLevel
	readonly message: ReadonlyArray<unknown>
	readonly annotations?: Record<string, unknown>
}

export const Request = R.tagged<Request>(
	'LogWithLevels',
)

export class Resolver extends C.Tag(
	'app/operations/LogWithLevelsResolver',
)<Resolver, RequestResolver<Request>>() {}
