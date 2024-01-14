import { from, useContext } from 'solid-js'

import { Model } from '@/app/view-models/add-food'

import { AppContext } from '@/ui/context'
import { withDefault } from '@/ui/core/solid-js'

const model: (m: Model) =>
	| Readonly<{
			type: 'loading'
	  }>
	| Readonly<{
			type: 'ready'
			model: {
				readonly name: string
			}
	  }>
	| Readonly<{
			type: 'adding'
	  }> = m => m

function AddFood() {
	const app = useContext(AppContext)!

	const model = from(app.addFood.stream)
	return (
		<button
			class="middle none rounded-lg bg-gray-900
			px-6 py-3 text-center align-middle font-sans text-xs font-bold
			uppercase text-white shadow-md shadow-gray-900/10 transition-all hover:shadow-lg
			hover:shadow-gray-900/20 focus:opacity-[0.85] focus:shadow-none active:opacity-[0.85]
			active:shadow-none disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none"
			data-ripple-light="true">
			Button
		</button>
	)
}

export default AddFood
