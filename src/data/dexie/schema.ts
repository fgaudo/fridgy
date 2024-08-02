export const PRODUCTS_TABLE = {
	name: 'products',
	columns: {
		id: 'id',
		name: 'name',
		expirationDate: 'expiration_date',
		isBestBefore: 'is_best_before',
		creationDate: 'creation_date',
	},
} as const
