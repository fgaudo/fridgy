import type * as Data from 'effect/Data'
import type * as Opt from 'effect/Option'
import type { License } from '../ports/licenses.ts'

export type State = Readonly<{
  licenses: Data.TaggedEnum<{
    Loading: object
    Loaded: Readonly<{ items: ReadonlyArray<License> }>
  }>
  saying: Data.TaggedEnum<{
    Loading: object
    Picked: Readonly<{ maybeSaying: Opt.Option<string> }>
  }>
}>
