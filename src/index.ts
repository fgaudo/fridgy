import { function as F } from 'fp-ts'

import { App } from '@/app'

import { products } from '@/data/mock/read/mock-products'
import { addProduct } from '@/data/mock/write/add-product'
import { log } from '@/data/mock/write/log'

import { render } from '@/ui'

const flip = F.flip
const root = document.getElementById('root')!

const app: App = new App({
	products$: products({}),
	appLog: flip(log)({ prefix: 'app' }),
	addProduct: flip(addProduct)(undefined),
})

render(app, root)
