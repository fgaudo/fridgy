import * as Eq from 'fp-ts/Eq'

export interface ProductInputDTO {
	name: string
	expDate: number
}

export type ProductDTO<ID> = {
	id: ID
} & ProductInputDTO

export function productDataEq<ID>(): Eq.Eq<
	ProductDTO<ID>
> {
	return Eq.fromEquals((a, b) => a.id === b.id)
}
