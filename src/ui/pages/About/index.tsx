import type { Component } from 'solid-js'

import { version } from '@/ui/core/constants'
import { useFridgyNavigate } from '@/ui/router'

export const About: () => Component =
	() => () => {
		const navigate = useFridgyNavigate()
		return (
			<>
				<mdui-top-app-bar>
					<mdui-button-icon
						prop:icon="arrow_back"
						onClick={() => {
							navigate(-1)
						}}></mdui-button-icon>
					<mdui-top-app-bar-title>
						About
					</mdui-top-app-bar-title>
				</mdui-top-app-bar>
				<div
					class="relative flex flex-col justify-center gap-2 px-[24px]"
					style={{
						animation:
							'opacityIn 0.5s ease-in-out',
					}}>
					<p class="text-titleLarge">Fridgy</p>
					<p>version: {version}</p>
					<p>© 2024 Francesco Gaudenzi</p>
					<mdui-divider class="my-[12px]"></mdui-divider>
					<p>
						This app is open source and released
						under the{' '}
						<a
							class="text-primary underline"
							href="https://www.gnu.org/licenses/agpl-3.0.en.html">
							AGPL-3.0 license
						</a>
						.
					</p>
					<p>
						The entire source code is available at{' '}
						<a
							class="text-primary underline"
							href="https://github.com/fgaudo/fridgy">
							https://github.com/fgaudo/fridgy
						</a>
					</p>

					<mdui-divider class="my-[12px]"></mdui-divider>
					<p>
						For any issues, requests or feedback
						you can{' '}
						<a
							class="text-primary underline"
							href="https://github.com/fgaudo/fridgy/issues">
							open a ticket
						</a>{' '}
						or send me an email at{' '}
						<a
							class="text-primary underline"
							href="mailto:fgaudo@gmail.com">
							fgaudo@gmail.com
						</a>
						.
					</p>
				</div>
			</>
		)
	}
