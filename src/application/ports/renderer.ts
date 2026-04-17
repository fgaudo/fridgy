import * as Context from 'effect/Context'
import type * as Effect from 'effect/Effect'
import * as Newtype from 'effect/Newtype'

export type View = Newtype.Newtype<'View', unknown>
export const View = Newtype.makeIso<View>()

export class Renderer extends Context.Service<
	Renderer,
	(view: View) => Effect.Effect<void>
>()('299c282976c8ceb6') {}
