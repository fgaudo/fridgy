import type { L } from '$lib/core/imports.ts'

import { type UseCases } from './app/use-cases.ts'
import { capacitor, mock } from './data/index.ts'

export {
	AddProduct,
	DeleteProductsByIds,
	GetSortedProducts,
} from './app/use-cases.ts'

export const useCases: L.Layer<UseCases> =
	import.meta.env.PROD ? capacitor : mock
