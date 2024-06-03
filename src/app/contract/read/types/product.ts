import { type Newtype } from 'newtype-ts'

export type Id = Newtype<
	{ readonly Id: unique symbol },
	string
>

export interface ProductDTO {
	name: string
	expDate:
		| {
				timestamp: number
				isBestBefore: boolean
		  }
		| undefined
}
