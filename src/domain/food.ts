export interface Food {
	readonly id: string
	readonly name: string
}

export const areEqual: (
	f1: Food,
	f2: Food,
) => boolean = (a, b) => a.id === b.id
