export const PRODUCTS_TABLE = {
	name: 'products',
	columns: {
		id: 'id',
		name: 'name',
		expiration: {
			name: 'expiration',
			value: {
				date: 'date',
				isBestBefore: 'is_best_before',
			},
		},
		creationDate: 'creation_date',
	},
} as const
