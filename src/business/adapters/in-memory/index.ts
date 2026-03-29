import * as Layer from 'effect/Layer'

import * as AddProduct from './add-product.ts'
import * as Delete from './delete-product-by-id.ts'
import * as GetProducts from './get-products.ts'

export const layer = Layer.mergeAll(
	Delete.layer,
	AddProduct.layer,
	GetProducts.layer,
)
