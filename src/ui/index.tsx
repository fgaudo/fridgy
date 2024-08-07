import { App as CAP } from '@capacitor/app'
import '@fontsource-variable/comfortaa/index.css'
import '@fontsource-variable/material-symbols-rounded/full.css'
import '@fontsource-variable/roboto-flex/full.css'
import {
	Hct,
	SchemeTonalSpot,
	argbFromHex,
} from '@material/material-color-utilities'
import {
	type Component,
	Show,
	createEffect,
	createResource,
	createSignal,
	on,
} from 'solid-js'
import {
	Portal,
	render as solidRender,
} from 'solid-js/web'
import { useTimeout } from 'solidjs-hooks'

import type { App } from '@/app'

import '@/ui/index.css'
import { applyTheme } from '@/ui/material-web'

import { onResumeInit } from './core/capacitor'
import { DEFAULT_FADE_MS } from './core/constants'
import { Router } from './router'

const MAIN_COLOR = '#DD7230'

export async function render(
	app: App,
	root: HTMLElement,
): Promise<void> {
	const scheme = new SchemeTonalSpot(
		Hct.fromInt(argbFromHex(MAIN_COLOR)),
		false,
		0.1,
	)

	applyTheme(document.body, scheme)

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
						class="transition-all duration-fade"
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
					<div class="font-titleLarge">
						quickfix
					</div>
					<md-icon>checkbox</md-icon>
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
					useTimeout(
						() => fade(true),
						DEFAULT_FADE_MS,
					)
				}
			},
			{ defer: true },
		),
	)

	return (
		<Show when={!isFaded()}>
			<Portal>
				<div
					class="fixed bottom-0 left-0 right-0 top-0 z-[999] flex items-center justify-center bg-background duration-[300ms]"
					classList={{
						'opacity-0 pointer-events-none':
							props.resourcesAreLoaded(),
					}}>
					<md-circular-progress
						prop:indeterminate={true}
					/>
				</div>
			</Portal>
		</Show>
	)
}
