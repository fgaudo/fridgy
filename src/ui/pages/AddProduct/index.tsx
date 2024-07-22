import { A } from '@solidjs/router'
import {
	Match,
	Switch,
	createRenderEffect,
} from 'solid-js'

import { SmallTopAppBar } from '@/ui/widgets/SmallTopAppBar'

import { useStore } from './store'

const AddProduct = () => {
	const [store, dispatch] = useStore()

	createRenderEffect(() => {
		dispatch({
			type: 'log',
			severity: 'debug',
			message: 'Opened add-product page',
		})
	})

	return (
		<div
			style={{
				animation: 'opacityIn 0.25s ease-in-out',
			}}>
			<SmallTopAppBar>
				<A href="/">
					<md-icon-button class="pl-[4px]">
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
				<Match
					when={
						store.currentDate.status ===
							'ready' && store.currentDate.date
					}>
					{date => (
						<div class="mt-[-50px] flex h-screen flex-col place-content-center gap-[28px] pb-[16px] pl-[16px] pr-[16px] pt-[70px]">
							<md-outlined-text-field
								prop:type="text"
								prop:label="Product name*"
							/>
							<div class="flex flex-col rounded-xl align-middle text-onSurface">
								<label
									for="expdate"
									class="text-primary relative left-[10px] top-[12px] inline-block flex-grow-0 self-start bg-surface p-[4px] text-[12px]">
									Expiration date*
								</label>
								<div class="flex items-center gap-3">
									<input
										type="date"
										id="expdate"
										class="focus:outline-primary flex-1 rounded-[4px] border-[1px] border-[rgb(82,68,61)] bg-surface p-4 focus:outline focus:outline-2"
										min={date()}
									/>
									<md-filled-icon-button class="h-[56px] w-[56px]">
										<md-icon>
											document_scanner
										</md-icon>
									</md-filled-icon-button>
								</div>
							</div>
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
							<md-filled-button class="mt-[20px]">
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
