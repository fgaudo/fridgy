import * as Context from 'effect/Context'
import type * as Effect from 'effect/Effect'
import type * as Opt from 'effect/Option'

export type License = Readonly<{
  packageName: string
  licenses: Opt.Option<string>
  repository: Opt.Option<string>
  publisher: Opt.Option<string>
  email: Opt.Option<string>
  copyright: Opt.Option<string>
  name: Opt.Option<string>
  description: Opt.Option<string>
}>

export class Licenses extends Context.Service<
  Licenses,
  {
    readonly all: Effect.Effect<ReadonlyArray<License>>
  }
>()('91d9e9576e0220b6') {}
