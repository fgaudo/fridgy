import * as Logic from '@/app/core/logic.ts'
import * as Fsm from '@/shared/fsm.ts'

export const layer = Fsm.layer({
	emitter: Logic.subscriptions,
	handleDefect: Logic.handleDefect,
	init: Logic.init,
	update: Logic.update,
})
