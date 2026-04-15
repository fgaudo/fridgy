import * as Context from 'effect/Context'
import type * as Effect from 'effect/Effect'
import * as Newtype from 'effect/Newtype'

export type HtmlView = Newtype.Newtype<'HtmlView', unknown>
export const HtmlView = Newtype.makeIso<HtmlView>()

export class Renderer extends Context.Service<
	Renderer,
	(view: HtmlView) => Effect.Effect<void>
>()('8811653853a1b7b1') {}
