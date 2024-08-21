import { Da, F, Int, NETS } from '@/core/imports'

import type { ProductModel } from '@/app/use-cases/get-sorted-products'

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
		deletedItems: Int.Integer
		total: Int.Integer
		models: ProductModel[]
	}
	DeleteProductsAndRefreshFailed: {
		message: NETS.NonEmptyTrimmedString
	}
	DeleteProductsAndRefreshStarted: {
		fiber: F.Fiber<unknown>
	}
	RefreshListStarted: { fiber: F.Fiber<unknown> }
	RefreshListSucceeded: {
		total: Int.Integer
		models: ProductModel[]
	}
	RefreshListFailed: {
		message: NETS.NonEmptyTrimmedString
	}
	ShowSuccessMessage: {
		message: NETS.NonEmptyTrimmedString
	}
	ShowErrorMessage: {
		message: NETS.NonEmptyTrimmedString
	}
	ResetMessage: object
}>

export const Message = Da.taggedEnum<Message>()

export const InternalMessage =
	Da.taggedEnum<InternalMessage>()
