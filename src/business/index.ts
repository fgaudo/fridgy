import * as Layer from 'effect/Layer'
import * as ManagedRuntime from 'effect/ManagedRuntime'

import { UseCasesWithDeps } from '@/feature/product-management/index.ts'

export * as Pages from './pages/index.ts'

export const mockRuntime = ManagedRuntime.make(
	Layer.provide(
		UseCasesWithDeps.mock.useCases,
		Layer.succeed(UseCasesWithDeps.mock.Config, { withErrors: false }),
	),
)

export const capacitorRuntime = ManagedRuntime.make(UseCasesWithDeps.capacitor)
