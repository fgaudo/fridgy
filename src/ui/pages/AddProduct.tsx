import { A } from '@solidjs/router'
import {
	Match,
	Switch,
	createRenderEffect,
	createSignal,
	useContext,
} from 'solid-js'

import { AppContext } from '@/ui/context'
import { SmallTopAppBar } from '@/ui/widgets/SmallTopAppBar'

const AddProduct = () => {
	const app = useContext(AppContext)!

	createRenderEffect(() => {
		console.debug('Opened add-product page')
	})

	const [state, setState] = createSignal<
		string | undefined
	>()

	createRenderEffect(() => {
		setState(
			new Date().toISOString().split('T')[0],
		)
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
			<Switch
				fallback={
					<md-circular-progress
						prop:indeterminate={true}
						class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
					/>
				}>
				<Match when={state()}>
					{date => (
						<div class="flex h-screen flex-col place-content-around gap-[24px] pb-[16px] pl-[16px] pr-[16px] pt-[70px]">
							<md-outlined-text-field
								prop:type="text"
								prop:label="Product name*"
								prop:supportingText="*required"
							/>
							<div class="flex flex-col rounded-xl bg-surface-container p-4 text-onSurface">
								<div class="flex items-center">
									<div class="flex flex-col">
										<label for="expdate">
											Expiration date
										</label>
										<input
											type="date"
											id="expdate"
											class="basis-full border-2 bg-surface-container"
											min={date()}
										/>
										<label
											class="flex items-center gap-3"
											for="before">
											Best Before
											<md-checkbox
												id="before"
												prop:name="group"
												prop:value="Best Before"
											/>
										</label>
									</div>
									<md-outlined-icon-button class="min-w-[40px]">
										<md-icon>
											document_scanner
										</md-icon>
									</md-outlined-icon-button>
								</div>
							</div>
							<md-filled-button class="mt-auto">
								Add product
							</md-filled-button>
						</div>
					)}
				</Match>
			</Switch>
		</div>
	)
}

export default AddProduct
