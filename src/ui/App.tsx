import * as Effect from 'effect/Effect'
import * as Opt from 'effect/Option'
import * as AsyncResult from 'effect/unstable/reactivity/AsyncResult'
import * as Atom from 'effect/unstable/reactivity/Atom'
import { useEffect } from 'react'

import * as StateManager from '@/core/state-manager.ts'

import { UseCase, UseCaseWithDeps } from '../business/index.ts'
import { useAtomStateManager } from '../lib/adapter.ts'
import * as Home from './home/slice.ts'
import * as Root from './state.ts'

function toReadable([event, dispatch]: readonly [
	StateManager.Event<Home.State, Home.Message>,
	dispatch: AsyncResult.AsyncResult<(m: Home.Message) => void>,
]) {
	return [Home.toReadable(event), dispatch] as const
}

export const App = ({
	runtime,
}: {
	runtime: Atom.AtomRuntime<UseCase.All>
}) => {
	const [event, dispatchResult] = toReadable(
		useAtomStateManager(
			runtime,
			Home.init,
			StateManager.prepare({
				update: Home.update,
				defectMessage: Home.fatalMessage,
				subscriptions: Home.subscriptions,
			}),
		),
	)

	return AsyncResult.builder(dispatchResult)
		.onInitial(() => <Text>ciao</Text>)
		.onSuccess(dispatch => <Text>ciao</Text>)
		.render()
}
