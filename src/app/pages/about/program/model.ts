import type * as Data from 'effect/Data'
import * as Opt from 'effect/Option'
import type { License } from '../ports/licenses.ts'
import type { State } from './state.ts'

export type Model = Readonly<{
  licenses: Data.TaggedEnum<{
    Loading: object
    Loaded: Readonly<{ items: ReadonlyArray<License> }>
  }>
  /** Empty until a saying has been picked, or when there is none. */
  saying: string
}>

export const makeModel = (state: State): Model => ({
  licenses: state.licenses,
  saying: state.saying._tag === 'Picked' ? Opt.getOrElse(state.saying.maybeSaying, () => '') : '',
})
