import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Stream from 'effect/Stream'

import * as Fsm from '@/core/fsm.ts'
import * as MessageDispatcher from '@/ports/inbound/message-dispatcher.ts'
import * as ModelEmitter from '@/ports/inbound/model-emitter/index.ts'

import * as Root from './state.ts'

export const layer = Effect.gen(function* () {
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
}).pipe(Layer.unwrap)
