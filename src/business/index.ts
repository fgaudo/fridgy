import * as Layer from 'effect/Layer'

import { type UseCases } from './app/use-cases.ts'
import { capacitor, mock } from './data/index.ts'

export {
	AddProduct,
	DeleteProductsByIds,
	GetSortedProducts,
} from './app/use-cases.ts'

export const useCases: Layer.Layer<UseCases> = import.meta.env.PROD
	? capacitor
	: mock
