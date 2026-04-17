import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Stream from 'effect/Stream'

import * as MessageDispatcher from '@/app/ports/state-manager/message-dispatcher.ts'
import * as ModelEmitter from '@/app/ports/state-manager/model-emitter.ts'
import * as Fsm from '@/shared/fsm.ts'

import * as Root from './pages/state.ts'

export const layer = Layer.unwrap(
	Effect.gen(function* () {
		const manager = yield* Fsm.prepare({
			update: Root.update,
			handleDefect: Root.handleDefect,
			emitter: Root.subscriptions,
		})(Root.init)
		return Layer.mergeAll(
			Layer.succeed(MessageDispatcher.MessageDispatcher, message =>
				Fsm.dispatch(manager, [message]),
			),
			Layer.succeed(
				ModelEmitter.ModelEmitter,
				Fsm.transitions(manager).pipe(
					Stream.map(({ state }) => Root.makeModel(state)),
				),
			),
		)
	}),
)
