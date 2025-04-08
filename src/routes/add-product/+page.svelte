<script lang="ts">
	import { O } from '$lib/core/imports.ts';

	import Ripple from '$lib/ui/components/ripple.svelte';

	let state = $state<{
		name?: string;
		expirationDate?: number;
		currentDate: number;
		isOk: boolean;
		isAdding: boolean;
	}>({
		currentDate: Date.now(),
		isOk: false,
		isAdding: false,
	});
</script>

<div
	class="bg-background flex h-screen flex-col justify-between"
>
	<div
		class="bg-secondary shadow-secondary/40 flex h-16 w-full items-center shadow-md"
	>
		<div
			class="ml-2 text-center flex h-12 w-12 items-center justify-center relative overflow-hidden rounded-full"
		>
			<Ripple
				ontap={() => {
					window.history.back();
				}}
			></Ripple>
			<span class="material-symbols text-2xl">
				arrow_back</span
			>
		</div>
		<div class="font-stylish pl-2 text-2xl">
			Add a product
		</div>
	</div>
	<figure
		class="font-stylish mx-auto max-w-screen-md p-8 opacity-50"
	>
		<div
			class="mb-3 flex items-center justify-center"
		>
			<svg
				class="mx-aut h-6 w-6"
				aria-hidden="true"
				xmlns="http://www.w3.org/2000/svg"
				fill="currentColor"
				viewBox="0 0 18 14"
			>
				<path
					d="M6 0H2a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h4v1a3 3 0 0 1-3 3H2a1 1 0 0 0 0 2h1a5.006 5.006 0 0 0 5-5V2a2 2 0 0 0-2-2Zm10 0h-4a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h4v1a3 3 0 0 1-3 3h-1a1 1 0 0 0 0 2h1a5.006 5.006 0 0 0 5-5V2a2 2 0 0 0-2-2Z"
				></path>
			</svg>
			<p class="ml-5">
				Italian Saying of the Day <br />{' '}
				(Roman dialect)
			</p>
		</div>
		<blockquote>
			<div
				class="flex items-center justify-center"
			>
				<p
					class="text-md mb-2 italic select-text"
				>
					Chi c'ha er pepe, lo mette alle rape; <br
					/>
					chi nun ce l'ha, le magna sciape.{' '}
				</p>
			</div>
			<p class="text-right text-sm"></p>
		</blockquote>
	</figure>

	<div class="flex w-full justify-center pb-32">
		<div
			class="flex w-full max-w-lg flex-col place-content-center gap-[28px] pr-[16px] pl-[16px]"
		>
			<div
				class="text-on-background flex flex-col rounded-xl align-middle"
			>
				<label
					for="name"
					class="bg-background text-primary relative top-[12px] left-[10px] inline-block grow-0 self-start p-[4px] text-[12px]"
				>
					Product name
				</label>
				<input
					type="text"
					bind:value={
						() => state.name ?? '',
						v => {
							state.name = v;
						}
					}
					placeholder="For example: Milk"
					id="name"
					class="bg-background ring-outline focus:ring-primary shadow-primary/70 ring-secondary w-full rounded-[4px] border-0 p-4 shadow-md ring-1 transition-all focus:border-0"
				/>
			</div>

			<div
				class="text-on-background flex flex-col rounded-xl align-middle"
			>
				<label
					for="expdate"
					class="bg-background text-primary relative top-[12px] left-[10px] inline-block grow-0 self-start p-[4px] text-[12px]"
				>
					Expiration date
				</label>
				<input
					type="date"
					bind:value={
						() =>
							state.expirationDate
								? new Date(state.expirationDate)
										.toISOString()
										.substring(0, 10)
								: '',
						value => {
							state.expirationDate =
								Date.parse(value);
						}
					}
					id="expdate"
					class="bg-background ring-outline focus:ring-primary shadow-primary/70 ring-secondary w-full rounded-[4px] border-0 p-4 shadow-md ring-1 transition-all focus:border-0"
					min={new Date(state.currentDate)
						.toISOString()
						.substring(0, 10)}
				/>
			</div>
			<div class="flex w-full justify-end pt-4">
				<div
					class={[
						'bg-primary flex items-center justify-center text-background shadow-primary/70 h-12 w-48 rounded-2xl shadow-md disabled:opacity-30 overflow-hidden relative',
						{
							'disabled:opacity-30':
								!state.isOk || state.isAdding,
						},
					]}
				>
					<Ripple ontap={() => {}}></Ripple>
					Add product
				</div>
			</div>
		</div>
	</div>
</div>
