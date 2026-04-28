export const ProductSchema = {
  columns: {
    creationDate: 'creation_date',
    id: 'id',
    name: 'name',
  },
  table: 'product',
} as const

export const ProductExpirationSchema = {
  columns: {
    date: 'date',
    id: 'id',
    productId: 'product_id',
  },
  table: 'product_expiration',
} as const
