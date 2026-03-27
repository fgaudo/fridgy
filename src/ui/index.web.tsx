import * as A from '@effect/atom-react'
import * as Effect from 'effect/Effect'
import * as AsyncResult from 'effect/unstable/reactivity/AsyncResult'
import * as Atom from 'effect/unstable/reactivity/Atom'

import * as StateManager from '@/core/state-manager.ts'

import { UseCaseWithDeps } from '../business/index.ts'
import { useStateManager } from '../lib/adapter.ts'
import * as Home from './home/slice.ts'
import * as Root from './state.ts'

const runtime = Atom.runtime(UseCaseWithDeps.inMemory)

const App = () => {
	const result = useStateManager(
		runtime,
		StateManager.makeScoped(Home.init, Home.update, Home.fatalMessage, {
			subscriptions: Home.subscriptions,
		}),
		m => {},
	)

	return AsyncResult.builder(result)
		.onInitial(() => <Text>ciao</Text>)
		.onSuccess(([state, dispatch]) => <Text>ciao</Text>)
}
