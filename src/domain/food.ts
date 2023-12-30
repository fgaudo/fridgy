import * as E from 'fp-ts/lib/Eq'

export interface Food {
	readonly id: string
	readonly name: string
}

export const Eq: E.Eq<Food> = E.fromEquals((a, b) => a.id === b.id)
