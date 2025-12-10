import { SqliteClient } from '@effect/sql-sqlite-react-native'
import { pipe } from 'effect/Function'
import * as Layer from 'effect/Layer'
import * as LogLevel from 'effect/LogLevel'
import * as Logger from 'effect/Logger'

import {
	UseCases,
	UseCasesWithoutDependencies,
} from '@/feature/product-management/index.ts'

export { UseCasesWithoutDependencies }

export const layers: Layer.Layer<UseCasesWithoutDependencies.All> = __DEV__
	? pipe(
			UseCases.inMemory({ withErrors: false }),
			Layer.provide([Logger.minimumLogLevel(LogLevel.Debug), Logger.pretty]),
		)
	: pipe(
			UseCases.sql,
			Layer.provide([
				Logger.logFmt,
				SqliteClient.layer({
					filename: 'fridgy.db',
				}),
			]),
			Layer.orDie,
		)
