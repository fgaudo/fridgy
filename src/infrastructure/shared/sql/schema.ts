export const ProductSchema = {
	table: 'product',
	columns: {
		id: 'id',
		name: 'name',
		creationDate: 'creation_date',
	},
} as const

export const ProductExpirationSchema = {
	table: 'product_expiration',
	columns: {
		id: 'id',
		date: 'date',
		productId: 'product_id',
	},
} as const
