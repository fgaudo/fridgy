import { AddProduct as AP } from '@/screen/add-product/index.tsx'

import { useFridgyContext } from '../lib/context.ts'

export default function AddProduct() {
	const runtime = useFridgyContext()

	return <AP runtime={runtime}></AP>
}
