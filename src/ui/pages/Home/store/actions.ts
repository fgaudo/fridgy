import {
	Da,
	F,
	NETS,
	NNInt,
	PInt,
} from '@/core/imports.js'

import type { ProductModel } from '@/app/use-cases/get-sorted-products.js'

export type Message = Da.TaggedEnum<{
	RefreshList: object
	DeleteProductsAndRefresh: object
	ClearSelectedProducts: object
	ToggleItem: { id: string }
}>

export type InternalMessage = Da.TaggedEnum<{
	DeleteProductsFailed: {
		message: NETS.NonEmptyTrimmedString
	}
	DeleteProductsAndRefreshSucceeded: {
		deletedItems: PInt.PositiveInteger
		total: NNInt.NonNegativeInteger
		models: ProductModel[]
	}
	DeleteProductsSucceededAndRefreshFailed: {
		message: NETS.NonEmptyTrimmedString
	}
	DeleteProductsAndRefreshStarted: {
		fiber: F.Fiber<unknown>
	}
	RefreshListStarted: { fiber: F.Fiber<unknown> }
	RefreshListSucceeded: {
		total: NNInt.NonNegativeInteger
		models: ProductModel[]
	}
	RefreshListFailed: {
		message: NETS.NonEmptyTrimmedString
	}
}>

export const Message = Da.taggedEnum<Message>()

export const InternalMessage =
	Da.taggedEnum<InternalMessage>()
