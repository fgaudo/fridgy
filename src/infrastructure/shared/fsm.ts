import * as Logic from '@/app/core/logic.ts'
import * as Fsm from '@/shared/fsm.ts'

export const layer = Fsm.layer({
  emitter: Logic.subscriptions,
  init: Logic.init,
  makeDefectMessage: Logic.makeDefectMessage,
  update: Logic.update,
})
