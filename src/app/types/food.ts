import { eq as Eq } from 'fp-ts'

export interface FoodInputDTO {
	readonly name: string
}

export type FoodDTO<ID> = {
	readonly id: ID
} & FoodInputDTO

export function foodDataEq<ID>(): Eq.Eq<
	FoodDTO<ID>
> {
	return Eq.fromEquals((a, b) => a.id === b.id)
}
