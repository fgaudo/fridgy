import * as Eq from 'fp-ts/Eq'

export interface FoodInputDTO {
	name: string
	expDate: number
}

export type FoodDTO<ID> = {
	id: ID
} & FoodInputDTO

export function foodDataEq<ID>(): Eq.Eq<
	FoodDTO<ID>
> {
	return Eq.fromEquals((a, b) => a.id === b.id)
}
