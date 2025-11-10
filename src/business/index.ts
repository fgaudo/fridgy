import * as ManagedRuntime from 'effect/ManagedRuntime'

import { type UseCases } from './app/use-cases.ts'
import { capacitor, mock } from './data/index.ts'

export {
	AddProduct,
	DeleteProductsByIds,
	GetSortedProducts,
} from './app/use-cases.ts'

export const runtime: ManagedRuntime.ManagedRuntime<UseCases, never> =
	ManagedRuntime.make(import.meta.env.PROD ? capacitor : mock)
