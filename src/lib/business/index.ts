import { L } from '$lib/core/imports.ts'

import {
	type UseCases,
	useCasesNoDeps,
} from './app/use-cases.ts'
import { Capacitor, Mock } from './data/index.ts'

export {
	AddProduct,
	DeleteProductsByIds,
	GetSortedProducts,
} from './app/use-cases.ts'

export const useCases: UseCases = L.provide(
	useCasesNoDeps,
	import.meta.env.PROD
		? Capacitor.allImplementations
		: Mock.allImplementations,
)
