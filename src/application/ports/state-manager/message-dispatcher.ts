import * as Context from 'effect/Context'
import type * as Effect from 'effect/Effect'

import type { Message } from '@/app/messages.ts'

export class MessageDispatcher extends Context.Service<
	MessageDispatcher,
	(m: Message) => Effect.Effect<void>
>()('f92236d4ace1403b') {}
