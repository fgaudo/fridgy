import { A } from '@solidjs/router'
import {
	createRenderEffect,
	useContext,
} from 'solid-js'

import { AppContext } from '@/ui/context'
import { Title } from '@/ui/widgets/Title'
import { TopAppBar } from '@/ui/widgets/TopAppBar'

const AddFood = () => {
	const app = useContext(AppContext)!

	createRenderEffect(() => {
		app.log('debug', 'Opened add-food page')
	})

	return (
		<div
			style={{
				animation: 'opacityIn 0.25s ease-in-out',
			}}
			class="transition-opacity duration-[3s]">
			<TopAppBar>
				<A href="/">
					<md-icon-button class="pl-[8px]">
						<md-icon>arrow_back</md-icon>
					</md-icon-button>
				</A>
				<Title>Add a new product</Title>
			</TopAppBar>
			<div class="flex h-screen flex-col place-content-around gap-6 pb-4 pl-4 pr-4 pt-[70px]">
				<md-outlined-text-field
					prop:type="text"
					prop:label="Product name"
					prop:placeholder="Example: Milk"
				/>

				<div class="flex items-center gap-3">
					<md-outlined-text-field
						class="basis-full"
						prop:type="date"
						prop:label="Expiration date"
						prop:placeholder="Example: Milk"
					/>
					<md-icon-button class="min-w-[40px]">
						<md-icon>document_scanner</md-icon>
					</md-icon-button>
				</div>

				<md-filled-button class="mt-auto">
					Add product
				</md-filled-button>
			</div>
		</div>
	)
}

export default AddFood
