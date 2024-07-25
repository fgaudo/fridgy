import { eq as Eq, option as OPT } from 'fp-ts'

export interface ProductDTO {
	name: string
	expDate: OPT.Option<{
		timestamp: number
		isBestBefore: boolean
	}>
}

export const ProductDTO = {
	Eq: Eq.fromEquals<ProductDTO>(() => false),

	create: ({
		name,
		expDate,
	}: {
		name: string
		expDate?: OPT.Option<{
			timestamp: number
			isBestBefore: boolean
		}>
	}): ProductDTO => ({
		name,
		expDate: expDate ?? OPT.none,
	}),
} as const
