import * as Logger from 'effect/Logger'

export const logger = Logger.replace(
	Logger.defaultLogger,
	Logger.prettyLoggerDefault,
)
