import * as Eq from 'fp-ts/lib/Eq'

export interface Food {
	readonly id: string
	readonly name: string
}

export const foodEq: Eq.Eq<Food> = Eq.fromEquals(
	(a, b) => a.id === b.id,
)
