import { A } from '@solidjs/router'
import {
	createRenderEffect,
	useContext,
} from 'solid-js'

import { AddProductContext } from '@/ui/context'
import { SmallTopAppBar } from '@/ui/widgets/SmallTopAppBar'

const AddProduct = () => {
	const app = useContext(AddProductContext)!

	createRenderEffect(() => {
		console.debug('Opened add-product page')
	})

	return (
		<div
			style={{
				animation: 'opacityIn 0.25s ease-in-out',
			}}>
			<SmallTopAppBar>
				<A href="/">
					<md-icon-button class="pl-[8px]">
						<md-icon>arrow_back</md-icon>
					</md-icon-button>
				</A>
				<div class="font-titleLarge text-titleLarge leading-titleLarge">
					Add a new product
				</div>
			</SmallTopAppBar>
			<div class="flex h-screen flex-col place-content-around gap-[24px] pb-[16px] pl-[16px] pr-[16px] pt-[70px]">
				<md-outlined-text-field
					prop:type="text"
					prop:label="Product name*"
					prop:supportingText="*required"
				/>
				<div class="mt-6 flex items-center gap-3">
					<md-outlined-text-field
						class="basis-full"
						prop:type="date"
						prop:label="Expiration date"
					/>
					<md-outlined-icon-button class="min-w-[40px]">
						<md-icon>document_scanner</md-icon>
					</md-outlined-icon-button>
				</div>
				<div class="flex gap-7">
					<label
						class="flex items-center gap-3"
						for="before">
						Best Before
						<md-switch
							prop:showOnlySelectedIcon={true}
							prop:icons={true}
							id="before"
							prop:name="group"
							prop:value="Best Before"
						/>
					</label>
				</div>
				<md-filled-button class="mt-auto">
					Add product
				</md-filled-button>
			</div>
		</div>
	)
}

export default AddProduct
