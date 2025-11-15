import { pipe } from 'effect/Function'
import * as Layer from 'effect/Layer'
import * as LogLevel from 'effect/LogLevel'
import * as Logger from 'effect/Logger'
import * as ManagedRuntime from 'effect/ManagedRuntime'

import { UseCasesWithDeps } from '@/feature/product-management/index.ts'

export * as Pages from './pages/index.ts'

export const runtime = import.meta.env.PROD
	? pipe(
			UseCasesWithDeps.capacitor,
			Layer.provide(Logger.logFmt),
			ManagedRuntime.make,
		)
	: pipe(
			UseCasesWithDeps.mock.useCases,
			Layer.provide([
				Layer.succeed(UseCasesWithDeps.mock.Config, { withErrors: false }),
				Logger.minimumLogLevel(LogLevel.Debug),
				Logger.pretty,
			]),
			ManagedRuntime.make,
		)
