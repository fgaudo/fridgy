import * as Effect from 'effect/Effect'
import * as uuid from 'uuid'

export const makeUuid = Effect.sync(() => uuid.v4())
