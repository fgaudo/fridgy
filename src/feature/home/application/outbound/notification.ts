import * as Context from 'effect/Context'
import type * as Effect from 'effect/Effect'

export class Notification extends Context.Service<
  Notification,
  { showToast: (text: string) => Effect.Effect<void> }
>()('c928605c03eb60a1') {}
