import { function as F } from 'fp-ts'
import * as Rx from 'rxjs'
import {
	createEffect,
	createRenderEffect,
	useContext,
} from 'solid-js'
import { createStore } from 'solid-js/store'

import type { LogSeverity } from '@/app/contract/write/log'

import { AppContext } from '@/ui/context'
import { useDispatcher } from '@/ui/core/solid-js'

const pipe = F.pipe

interface Store {
	currentDate:
		| { status: 'loading' }
		| { status: 'ready'; date: string }
}

type Command =
	| {
			type: 'log'
			severity: LogSeverity
			message: string
	  }
	| { type: 'addProduct' }

export const useStore: () => [
	Store,
	(command: Command) => void,
] = () => {
	const app = useContext(AppContext)!

	const [store, setStore] = createStore<Store>({
		currentDate: { status: 'loading' },
	})

	createRenderEffect(() => {
		setStore('currentDate', {
			status: 'ready',
			date: new Date()
				.toISOString()
				.split('T')[0],
		})
	})

	const dispatch = useDispatcher<Command>(cmd =>
		Rx.merge(
			pipe(
				cmd,
				Rx.filter(cmd => cmd.type === 'log'),
				Rx.tap(cmd => {
					app.log(cmd)()
				}),
				Rx.ignoreElements(),
			),
		),
	)

	return [store, dispatch]
}
