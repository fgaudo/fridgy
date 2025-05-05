import { RequestResolver } from 'effect'

import {
	Eff,
	L,
	pipe,
} from '$lib/core/imports.ts'

import { LogWithLevel } from '$lib/business/app/use-cases.ts'

export const uiLogWithLevelResolverLayer =
	L.succeed(
		LogWithLevel.Resolver,
		RequestResolver.fromEffect(
			({ message, annotations, level }) =>
				pipe(
					Eff.logWithLevel(level, message),
					Eff.annotateLogs({
						...(annotations ?? {}),
						_LAYER_: 'U',
					}),
				),
		),
	)
