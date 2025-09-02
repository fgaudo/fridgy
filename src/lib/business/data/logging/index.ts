import * as Logger from 'effect/Logger'

import { withLayerLogger } from '$lib/core/logging.ts'

export const logger = Logger.replace(
	Logger.defaultLogger,
	Logger.prettyLoggerDefault.pipe(withLayerLogger),
)
