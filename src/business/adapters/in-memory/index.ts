import * as Layer from 'effect/Layer'

import * as GetProducts from '../../../screens/home/memory-get-products.adapter.ts'
import * as Delete from '../../../screens/home/memory-repository.adapter.ts'
import * as AddProduct from './add-product.ts'

export const layer = Layer.mergeAll(
	Delete.layer,
	AddProduct.layer,
	GetProducts.layer,
)
