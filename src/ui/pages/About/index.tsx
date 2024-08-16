import {
	type Component,
	For,
	Show,
} from 'solid-js'

import licenses from '@/ui/assets/licenses.json'
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
				<div class="flex flex-col justify-center gap-2 px-[24px]">
					<p class="font-titleLarge text-xl">
						Fridgy
					</p>
					<p>
						version:{' '}
						<span class="text-primary">
							{version}
						</span>
					</p>
					<p>© 2024 Francesco Gaudenzi</p>
					<mdui-divider class="my-[12px] h-[5px]"></mdui-divider>
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

					<mdui-divider class="my-[12px] h-[5px]"></mdui-divider>

					<p>
						Fridgy uses many other open source
						libraries.
						<br /> Here's the complete list of
						software.
					</p>

					<mdui-divider class="my-[12px]"></mdui-divider>

					<For each={Object.entries(licenses)}>
						{([name, license]) => (
							<>
								<h1>{name}</h1>
								<Show
									when={
										'publisher' in license &&
										license.publisher
									}>
									{value => <p>{value()}</p>}
								</Show>
								<Show
									when={
										'email' in license &&
										license.email
									}>
									{value => <p>{value()}</p>}
								</Show>
								<Show
									when={
										'licenses' in license &&
										license.licenses
									}>
									{value => <p>{value()}</p>}
								</Show>
								<Show
									when={
										'repository' in license &&
										license.repository
									}>
									{value => (
										<a
											class="text-primary underline"
											href={encodeURI(value())}>
											{value()}
										</a>
									)}
								</Show>
								<mdui-divider class="my-[12px]"></mdui-divider>
							</>
						)}
					</For>
				</div>
			</>
		)
	}
