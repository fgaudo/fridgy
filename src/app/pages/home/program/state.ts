import * as Brand from 'effect/Brand'
import type * as Data from 'effect/Data'
import type * as DateTime from 'effect/DateTime'
import type * as Opt from 'effect/Option'
import type * as NonEmptyHashSet from '@/libs/collections/non-empty-hash-set.ts'
import type * as Domain from '../domain/product.ts'

/**
 * Identifies an asynchronous operation (adding, deleting). Its
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
  Valid: Readonly<{ id: string; product: Domain.Product }>
}>

type Form = Readonly<{
  maybeName: Opt.Option<string>
  maybeExpirationDate: Opt.Option<DateTime.Utc>
}>

export type State = Readonly<{
  isMenuOpen: boolean
  isViewportAtTop: boolean
  isInteracting: boolean
  nextOperation: OperationId
  /** The current time, once the clock has ticked: expiration statuses derive from it. */
  maybeNow: Opt.Option<DateTime.Utc>
  products: Data.TaggedEnum<{
    Loading: object
    Failed: object
    Loaded: Readonly<{ items: ReadonlyArray<Product> }>
  }>
  selection: Data.TaggedEnum<{
    Selecting: Readonly<{ maybeIds: Opt.Option<NonEmptyHashSet.NonEmptyHashSet<string>> }>
    Deleting: Readonly<{ operation: OperationId; ids: NonEmptyHashSet.NonEmptyHashSet<string> }>
  }>
  addProduct: Data.TaggedEnum<{
    Closed: object
    Editing: Form
    Submitting: Form & Readonly<{ operation: OperationId }>
  }>
}>
