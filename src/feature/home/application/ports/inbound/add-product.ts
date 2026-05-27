import * as Context from 'effect/Context'
import type * as DateTime from 'effect/DateTime'
import type * as Effect from 'effect/Effect'
import type * as Opt from 'effect/Option'

export type Params = {
  maybeName: Opt.Option<string>
  maybeExpirationDate: Opt.Option<DateTime.Utc>
}

export class AddProduct extends Context.Service<
  AddProduct,
  (params: Params) => Effect.Effect<void, void>
>()('c5062cc6fbc0a397') {}
