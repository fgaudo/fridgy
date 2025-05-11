import { Log } from '$lib/core/imports.ts'
import { withLayerLogger } from '$lib/core/logging.ts'

export const logger = Log.replace(
	Log.defaultLogger,
	Log.prettyLoggerDefault.pipe(withLayerLogger),
)
