export interface ProductDTO {
	name: string
	expDate:
		| {
				timestamp: number
				isBestBefore: boolean
		  }
		| undefined
}
