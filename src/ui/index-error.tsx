import '$lib/ui/index.css';
import { onMount } from 'solid-js';
import { render as solidRender } from 'solid-js/web';

export function renderError(
	root: HTMLElement,
	message: string,
): void {
	solidRender(() => {
		let dialog!: HTMLDialogElement;

		onMount(() => {
			dialog.showModal();
		});

		return (
			<dialog
				ref={dialog}
				class="rounded-lg border border-red-300 bg-red-50 p-4 text-red-800 dark:border-red-800 dark:bg-gray-800 dark:text-red-400"
				role="alert"
			>
				<div class="flex items-center">
					<svg
						class="me-2 h-4 w-4 shrink-0"
						aria-hidden="true"
						xmlns="http://www.w3.org/2000/svg"
						fill="currentColor"
						viewBox="0 0 20 20"
					>
						<path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5ZM9.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM12 15H8a1 1 0 0 1 0-2h1v-3H8a1 1 0 0 1 0-2h2a1 1 0 0 1 1 1v4h1a1 1 0 0 1 0 2Z"></path>
					</svg>
					<span class="sr-only">Info</span>
					<h3 class="text-lg font-medium">
						Something went wrong! :(
					</h3>
				</div>
				<div class="mt-2 mb-4 text-sm">
					{message}
				</div>
			</dialog>
		);
	}, root);
}
