// sort-imports-ignore
import '@fontsource-variable/comfortaa/index.css'
import '@fontsource-variable/roboto-flex/full.css'
import '@fontsource/material-icons/index.css'
import '@/ui/index.css'

import { App as CAP } from '@capacitor/app'
import {
	type Component,
	Show,
	createEffect,
	createResource,
	createSignal,
	on,
	onCleanup,
} from 'solid-js'
import {
	Portal,
	render as solidRender,
} from 'solid-js/web'

import { Eff, F, H } from '@/core/imports.ts'

import type { App } from '@/app/index.ts'

import { onResumeInit } from './core/capacitor.ts'
import { DEFAULT_FADE_MS } from './core/constants.ts'
import { Router } from './router.tsx'
import { SafePortal } from './widgets/SafePortal.tsx'

export async function render(
	app: App,
	root: HTMLElement,
): Promise<void> {
	await Promise.all([
		onResumeInit(),
		CAP.addListener('backButton', e => {
			if (!e.canGoBack) {
				void CAP.exitApp()
				return
			}
			window.history.back()
		}),
	])

	solidRender(
		() => {
			const [isFontLoaded] = createResource(
				() =>
					document.fonts.ready.then(() => true),
				{ initialValue: false },
			)

			return (
				<>
					<FontLoad isFontLoaded={isFontLoaded} />
					<LoadingScreen
						resourcesAreLoaded={isFontLoaded}
					/>
					<div
						class="duration-fade transition-all"
						classList={{
							'opacity-0 invisible':
								!isFontLoaded(),
						}}>
						<Router app={app} />
					</div>
				</>
			)
		},

		root,
	)
}

const FontLoad: Component<{
	isFontLoaded: () => boolean
}> = props => {
	return (
		<Show when={!props.isFontLoaded()}>
			<Portal>
				{/* quick fix to preload all fonts needed in the project..*/}

				<div
					class="invisible fixed"
					aria-hidden={true}>
					<div class="font-title-large">
						quickfix
					</div>
					<span class="material-icons">face</span>
				</div>
			</Portal>
		</Show>
	)
}

const LoadingScreen: Component<{
	resourcesAreLoaded: () => boolean
}> = props => {
	const [isFaded, fade] = createSignal(false)

	createEffect(
		on(
			() => props.resourcesAreLoaded(),
			loaded => {
				if (loaded) {
					const fiber = H.runForkWithLogs(
						Eff.gen(function* () {
							yield* Eff.sleep(DEFAULT_FADE_MS)
							fade(true)
						}),
					)
					onCleanup(() => {
						H.runForkWithLogs(F.interrupt(fiber))
					})
				}
			},
			{ defer: true },
		),
	)

	return (
		<SafePortal>
			<div
				class="fixed top-0 right-0 bottom-0 left-0 z-999 flex items-center justify-center duration-[300ms]"
				classList={{
					'opacity-0 pointer-events-none':
						isFaded(),
				}}>
				<div role="status">
					<svg
						aria-hidden="true"
						class="fill-accent text-background h-8 w-8 animate-spin"
						viewBox="0 0 100 101"
						fill="none"
						xmlns="http://www.w3.org/2000/svg">
						<path
							d="M93.9676 39.0409C96.393 38.4038
							97.8624 35.9116 97.0079
							33.5539C95.2932 28.8227 92.871
							24.3692 89.8167 20.348C85.8452
							15.1192 80.8826 10.7238 75.2124
							7.41289C69.5422 4.10194 63.2754
							1.94025 56.7698 1.05124C51.7666
							0.367541 46.6976 0.446843 41.7345
							1.27873C39.2613 1.69328 37.813
							4.19778 38.4501 6.62326C39.0873
							9.04874 41.5694 10.4717 44.0505
							10.1071C47.8511 9.54855 51.7191
							9.52689 55.5402 10.0491C60.8642
							10.7766 65.9928 12.5457 70.6331
							15.2552C75.2735 17.9648 79.3347
							21.5619 82.5849 25.841C84.9175
							28.9121 86.7997 32.2913 88.1811
							35.8758C89.083 38.2158 91.5421
							39.6781 93.9676 39.0409Z"
							fill="currentFill"></path>
					</svg>
					<span class="sr-only">Loading...</span>
				</div>
			</div>
		</SafePortal>
	)
}
