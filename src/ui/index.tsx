// sort-imports-ignore
import '@fontsource-variable/comfortaa/index.css'
import '@fontsource-variable/roboto-flex/full.css'
import '@fontsource/material-icons/index.css'
import 'mdui/mdui.css'
import '@/ui/index.css'

import { App as CAP } from '@capacitor/app'
import 'mdui'
import { setColorScheme } from 'mdui'
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

const MAIN_COLOR = '#DD7230'

export async function render(
	app: App,
	root: HTMLElement,
): Promise<void> {
	setColorScheme(MAIN_COLOR)

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
					<mdui-icon prop:name="check_box"></mdui-icon>
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
		<Portal>
			<div
				class="fixed top-0 right-0 bottom-0 left-0 z-999 flex items-center justify-center duration-[300ms]"
				classList={{
					'opacity-0 pointer-events-none':
						isFaded(),
				}}>
				<mdui-circular-progress></mdui-circular-progress>
			</div>
		</Portal>
	)
}
