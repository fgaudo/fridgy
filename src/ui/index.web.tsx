import * as Effect from 'effect/Effect'
import * as AsyncResult from 'effect/unstable/reactivity/AsyncResult'
import * as Atom from 'effect/unstable/reactivity/Atom'

import * as StateManager from '@/core/state-manager.ts'

import { UseCaseWithDeps } from '../business/index.ts'
import { useAtomStateManager } from '../lib/adapter.ts'
import * as Home from './home/slice.ts'
import * as Root from './state.ts'

const runtime = Atom.runtime(UseCaseWithDeps.inMemory)

const App = () => {
	const result = useAtomStateManager(
		runtime,
		StateManager.makeScoped(Home.init, Home.update, Home.fatalMessage, {
			subscriptions: Home.subscriptions,
		}),
		{ messages: () => {} },
	)

	return AsyncResult.builder(result)
		.onInitial(() => <Text>ciao</Text>)
		.onSuccess(([state, dispatch]) => <Text>ciao</Text>)
		.render()
}
