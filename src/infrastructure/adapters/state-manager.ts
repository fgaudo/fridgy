import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Stream from 'effect/Stream'

import * as RootUpdate from '@/app/core/logic.ts'
import * as RootModel from '@/app/core/model.ts'
import * as MessageDispatcher from '@/app/ports/state-manager/message-dispatcher.ts'
import * as ModelEmitter from '@/app/ports/state-manager/model-emitter.ts'
import * as Fsm from '@/shared/fsm.ts'

export const layer = Layer.unwrap(
	Effect.gen(function* () {
		const manager = yield* Fsm.prepare({
			update: RootUpdate.update,
			handleDefect: RootUpdate.handleDefect,
			emitter: RootUpdate.subscriptions,
		})(RootUpdate.init)
		return Layer.mergeAll(
			Layer.succeed(MessageDispatcher.MessageDispatcher, message =>
				Fsm.dispatch(manager, [message]),
			),
			Layer.succeed(
				ModelEmitter.ModelEmitter,
				Fsm.transitions(manager).pipe(
					Stream.map(({ state }) => RootModel.makeModel(state)),
				),
			),
		)
	}),
)
