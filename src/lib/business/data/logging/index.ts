import { HashMap, pipe } from 'effect'

import { Log, O } from '$lib/core/imports.ts'

export { appLogWithLevelLayer } from './resolvers/log-with-level.ts'

export { uiLogWithLevelResolverLayer as uiLogWithLevelLayer } from './resolvers/ui-log-with-level.ts'

export const logger = Log.replace(
	Log.defaultLogger,
	Log.mapInputOptions(
		Log.prettyLoggerDefault,
		options => ({
			...options,
			message: pipe(
				options.annotations,
				HashMap.get('_LAYER_'),
				O.match({
					onSome: layer =>
						`[${layer}] ${options.message}`,
					onNone: () => options.message,
				}),
			),
		}),
	),
)
