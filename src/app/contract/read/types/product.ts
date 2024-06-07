import { eq as Eq } from 'fp-ts'

export interface ProductDTO {
	name: string
	expDate:
		| {
				timestamp: number
				isBestBefore: boolean
		  }
		| undefined
}

export const ProductDTO = {
	Eq: Eq.fromEquals<ProductDTO>(() => false),
} as const
