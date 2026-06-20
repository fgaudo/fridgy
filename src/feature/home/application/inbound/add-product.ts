import * as Context from 'effect/Context'
import type * as DateTime from 'effect/DateTime'
import type * as Opt from 'effect/Option'
import type * as Stream from 'effect/Stream'

export type Params = {
  maybeName: Opt.Option<string>
  maybeExpirationDate: Opt.Option<DateTime.Utc>
}

export class AddProduct extends Context.Service<
  AddProduct,
  Stream.Stream<Params>
>()('4d8ae10c7b65d242') {}
