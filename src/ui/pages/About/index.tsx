import { A } from '@solidjs/router'
import type { Component } from 'solid-js'
import { Portal } from 'solid-js/web'

import { version } from '@/ui/core/constants'
import { ROUTES } from '@/ui/router'
import { SmallTopAppBar } from '@/ui/widgets/SmallTopAppBar'

export const About: () => Component =
	() => () => {
		return (
			<>
				<Portal>
					<SmallTopAppBar>
						<div class="flex h-full w-full items-center gap-[24px] px-[16px] transition-all">
							<A href={ROUTES.home}>
								<md-icon-button class="pl-[4px]">
									<md-icon>arrow_back</md-icon>
								</md-icon-button>
							</A>
							<div class="font-titleLarge text-titleLarge leading-titleLarge">
								About
							</div>
						</div>
					</SmallTopAppBar>
				</Portal>
				<div class="flex flex-col justify-center gap-2 px-[24px] pt-[80px]">
					<p class="text-titleLarge">Fridgy</p>
					<p>version: {version}</p>
					<p>© 2024 Francesco Gaudenzi</p>
					<md-divider class="my-[12px]" />
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

					<md-divider class="my-[12px]" />
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
