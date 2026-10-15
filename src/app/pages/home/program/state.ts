import * as Brand from 'effect/Brand'
import type * as Data from 'effect/Data'
import type * as DateTime from 'effect/DateTime'
import type * as Duration from 'effect/Duration'
import type * as Opt from 'effect/Option'
import type * as NonEmptyHashSet from '@/libs/collections/non-empty-hash-set.ts'
import type * as UnitInterval from '@/libs/numbers/unit-interval.ts'

/**
 * Identifies an asynchronous operation (adding, deleting, validating). Its
 * completion carries the id back, and is only applied if that operation is
 * still the current one: a late completion is stale and rejected.
 */
export type OperationId = Brand.Branded<number, 'OperationId'>
const _OperationId = Brand.nominal<OperationId>()
export const OperationId = {
  first: _OperationId(0),
  make: _OperationId,
  next: (id: OperationId) => _OperationId(id + 1),
}

export type Product = Data.TaggedEnum<{
  /** Stored data so broken it cannot even be referenced. */
  Corrupt: Readonly<{ maybeName: Opt.Option<string> }>
  /** Stored with an id, but not a valid product: it can still be selected and deleted. */
  Invalid: Readonly<{ id: string; maybeName: Opt.Option<string> }>
  Valid: Readonly<{
    id: string
    name: string
    status: Data.TaggedEnum<{
      Everlasting: object
      Stale: Readonly<{ expirationDate: DateTime.Utc }>
      Fresh: Readonly<{
        expirationDate: DateTime.Utc
        timeLeft: Duration.Duration
        freshnessRatio: UnitInterval.UnitInterval
      }>
    }>
  }>
}>

type Form = Readonly<{
  maybeName: Opt.Option<string>
  maybeExpirationDate: Opt.Option<DateTime.Utc>
}>

export type State = Readonly<{
  isMenuOpen: boolean
  isViewportAtTop: boolean
  isInteracting: boolean
  /** The id the next asynchronous operation will get. */
  nextOperation: OperationId
  /** The latest validation requested: only its result is applied. */
  latestValidation: Opt.Option<OperationId>
  /** The product list, as last received. */
  products: Data.TaggedEnum<{
    Loading: object
    Failed: object
    Loaded: Readonly<{ items: ReadonlyArray<Product> }>
  }>
  /** What the user selected, and the deletion of a selection. */
  selection: Data.TaggedEnum<{
    Selecting: Readonly<{ maybeIds: Opt.Option<NonEmptyHashSet.NonEmptyHashSet<string>> }>
    Deleting: Readonly<{ operation: OperationId; ids: NonEmptyHashSet.NonEmptyHashSet<string> }>
  }>
  /** The "add a product" form, and the submission of its content. */
  addProduct: Data.TaggedEnum<{
    Closed: object
    Editing: Form
    Submitting: Form & Readonly<{ operation: OperationId }>
  }>
}>
