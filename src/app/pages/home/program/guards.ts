// The conditions under which the messages that may be rejected make sense.
// Both `update` (to accept or reject a message) and `makeModel` (to offer it to
// the view or not) use them, so the two cannot disagree.
import type * as Data from 'effect/Data'
import * as Opt from 'effect/Option'
import type * as NonEmptyHashSet from '@/libs/collections/non-empty-hash-set.ts'
import * as NormalizedString from '@/libs/strings/normalized-string.ts'
import type { State } from './state.ts'

type Editing = Data.TaggedEnum.Value<State['addProduct'], 'Editing'>
type Selecting = Data.TaggedEnum.Value<State['selection'], 'Selecting'>
type Loaded = Data.TaggedEnum.Value<State['products'], 'Loaded'>
type WithSelection = Selecting & {
  readonly maybeIds: Opt.Some<NonEmptyHashSet.NonEmptyHashSet<string>>
}

export const canStartAdding = (state: State): state is State & { readonly addProduct: Editing } =>
  state.addProduct._tag === 'Editing'
  && Opt.exists(state.addProduct.maybeName, (name) => Opt.isSome(NormalizedString.fromString(name)))

export const canToggleItems = (
  state: State,
): state is State & { readonly products: Loaded; readonly selection: Selecting } =>
  state.products._tag === 'Loaded' && state.selection._tag === 'Selecting'

export const canClearSelection = (state: State): state is State & { readonly selection: WithSelection } =>
  state.selection._tag === 'Selecting' && Opt.isSome(state.selection.maybeIds)

export const canDeleteSelected = (
  state: State,
): state is State & { readonly products: Loaded; readonly selection: WithSelection } =>
  state.products._tag === 'Loaded' && canClearSelection(state)
