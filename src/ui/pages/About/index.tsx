import {
	type Component,
	For,
	Show,
} from 'solid-js'

import licenses from '@/ui/assets/licenses.json'
import { version } from '@/ui/core/constants.ts'
import { useFridgyNavigate } from '@/ui/router.tsx'

export const About: () => Component =
	() => () => {
		const navigate = useFridgyNavigate()

		return (
			<div>
				<span
					class="material-symbols"
					onClick={() => {
						navigate(-1)
					}}>
					face
				</span>

				<div class="flex flex-col justify-center gap-2 px-[24px]">
					<p class="font-stylish text-xl">
						Fridgy
					</p>
					<p>
						version:{' '}
						<span class="text-primary">
							{version}
						</span>
					</p>
					<p>© 2024 Francesco Gaudenzi</p>
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

					<p>
						Fridgy uses many other open source
						libraries.
						<br /> Here's the complete list of
						software.
					</p>

					<For each={Object.entries(licenses)}>
						{([name, license]) => (
							<div
								class="mb-[20px] overflow-x-scroll text-nowrap"
								style={{
									'content-visibility': 'auto',
								}}>
								<Show
									fallback={
										<h1 class="font-bold">
											{name}
										</h1>
									}
									when={
										'name' in license &&
										license.name.trim().length >
											0 &&
										license.name
									}>
									{value => (
										<h1 class="font-bold">
											{value()}
										</h1>
									)}
								</Show>
								<Show
									when={
										'description' in license &&
										license.description
									}>
									{value => <p>{value()}</p>}
								</Show>
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
										'copyright' in license &&
										license.copyright
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
							</div>
						)}
					</For>
				</div>
			</div>
		)
	}
