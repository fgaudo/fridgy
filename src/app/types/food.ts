import { eq as Eq } from 'fp-ts'
import * as t from 'io-ts'
import { withFallback } from 'io-ts-types'

export const FoodDTO = t.readonly(
	t.type({
		id: t.string,
		name: withFallback(
			t.union([t.string, t.undefined]),
			undefined,
		),
	}),
)

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
