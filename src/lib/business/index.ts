import { type UseCases } from './app/use-cases.ts'
import { capacitor, mock } from './data/index.ts'

export {
	AddProduct,
	DeleteProductsByIds,
	GetSortedProducts,
	LogWithLevel,
} from './app/use-cases.ts'

export const useCases: UseCases = import.meta.env
	.PROD
	? capacitor
	: mock
