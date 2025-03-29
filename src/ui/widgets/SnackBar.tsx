import {
	type Component,
	createEffect,
	createSignal,
	on,
} from 'solid-js'

import {
	Eff,
	F,
	H,
	NETS,
	O,
} from '@/core/imports.ts'

export const Snackbar: Component<{
	class?: string | undefined
	classList?: Record<string, boolean | undefined>
	message: O.Option<{
		type: 'success' | 'error'
		text: NETS.NonEmptyTrimmedString
	}>
}> = props => {
	const [toast, setToast] = createSignal<
		O.Option<
			readonly [
				F.Fiber<unknown, unknown>,
				(
					| readonly [
							'error',
							NETS.NonEmptyTrimmedString,
					  ]
					| readonly [
							'success',
							NETS.NonEmptyTrimmedString,
					  ]
				),
			]
		>
	>(O.none())

	const interruptToastRemoval = () => {
		const toastOpt = toast()
		if (O.isSome(toastOpt)) {
			H.runForkWithLogs(
				F.interrupt(toastOpt.value[0]),
			)
		}
	}

	createEffect(
		on(
			() => props.message,
			message => {
				interruptToastRemoval()

				if (O.isNone(message)) {
					setToast(O.none())
					return
				}

				const fiber = H.runForkWithLogs(
					Eff.gen(function* () {
						yield* Eff.sleep(3000)
						setToast(O.none())
					}),
				)

				setToast(
					O.some([
						fiber,
						[
							message.value.type,
							message.value.text,
						],
					] as const),
				)
			},
		),
	)

	const isErrorToast = () => {
		const res = toast()
		return (
			O.isSome(res) && res.value[1][0] === 'error'
		)
	}

	const isSuccessToast = () => {
		const res = toast()
		return (
			O.isSome(res) &&
			res.value[1][0] === 'success'
		)
	}

	return (
		<div
			onClick={() => {
				interruptToastRemoval()
				setToast(O.none())
			}}
			class="duration-fade transition-all"
			classList={{
				'opacity-0 pointer-events-none': O.isNone(
					props.message,
				),
			}}>
			<div
				class={props.class}
				classList={props.classList ?? {}}>
				<div
					classList={{
						'opacity-0 pointer-events-none':
							!isErrorToast(),
						'opacity-100': isErrorToast(),
					}}
					id="toast-danger"
					class="bg-inverse-surface duration-fade fixed right-1/2 bottom-0 mb-4 flex w-full max-w-xs translate-x-1/2 items-center rounded-lg p-4 text-gray-500 shadow-sm shadow-black/40 transition-all"
					role="alert">
					<div class="inline-flex h-8 w-8 shrink-0 items-center justify-center text-red-500 dark:text-red-200">
						<svg
							class="h-5 w-5"
							aria-hidden="true"
							xmlns="http://www.w3.org/2000/svg"
							fill="currentColor"
							viewBox="0 0 20 20">
							<path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5Zm3.707 11.793a1 1 0 1 1-1.414 1.414L10 11.414l-2.293 2.293a1 1 0 0 1-1.414-1.414L8.586 10 6.293 7.707a1 1 0 0 1 1.414-1.414L10 8.586l2.293-2.293a1 1 0 0 1 1.414 1.414L11.414 10l2.293 2.293Z"></path>
						</svg>
						<span class="sr-only">
							Error icon
						</span>
					</div>
					<div class="text-inverse-on-surface ms-3 text-sm font-normal">
						{(() => {
							const res = toast()
							if (O.isSome(res)) {
								return res.value[1][1]
							}
							return ''
						})()}
					</div>
				</div>
				<div
					classList={{
						'opacity-0 pointer-events-none':
							!isSuccessToast(),
						'opacity-100': isSuccessToast(),
					}}
					id="toast-success"
					class="bg-inverse-surface duration-fade fixed right-1/2 bottom-0 mb-4 flex w-full max-w-xs translate-x-1/2 items-center rounded-lg p-4 text-gray-500 shadow-sm shadow-black/50 transition-all"
					role="alert">
					<div class="inline-flex h-8 w-8 shrink-0 items-center justify-center text-green-500 dark:text-green-200">
						<svg
							class="h-5 w-5"
							aria-hidden="true"
							xmlns="http://www.w3.org/2000/svg"
							fill="currentColor"
							viewBox="0 0 20 20">
							<path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5Zm3.707 8.207-4 4a1 1 0 0 1-1.414 0l-2-2a1 1 0 0 1 1.414-1.414L9 10.586l3.293-3.293a1 1 0 0 1 1.414 1.414Z"></path>
						</svg>
						<span class="sr-only">
							Check icon
						</span>
					</div>
					<div class="text-inverse-on-surface ms-3 text-sm font-normal">
						{(() => {
							const res = toast()
							if (O.isSome(res)) {
								return res.value[1][1]
							}
							return ''
						})()}
					</div>
				</div>
			</div>
		</div>
	)
}
