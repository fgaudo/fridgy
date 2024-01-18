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
			}}>
			<TopAppBar>
				<A href="/">
					<md-icon-button class="pl-[8px]">
						<md-icon>arrow_back</md-icon>
					</md-icon-button>
				</A>
				<Title>Add a new product</Title>
			</TopAppBar>
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
						prop:placeholder="Example: Milk"
					/>
					<md-outlined-icon-button class="min-w-[40px]">
						<md-icon>document_scanner</md-icon>
					</md-outlined-icon-button>
				</div>
				<div class="flex gap-6">
					<label
						class="flex  items-center gap-3"
						for="before">
						Before
						<md-radio
							prop:disabled={true}
							id="before"
							prop:name="group"
							prop:value="Best Before"
						/>
					</label>
					<label
						class="flex items-center gap-3"
						for="best-before">
						Best before
						<md-radio
							prop:disabled={true}
							id="best-before"
							prop:name="group"
							prop:value="Before"
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

export default AddFood
