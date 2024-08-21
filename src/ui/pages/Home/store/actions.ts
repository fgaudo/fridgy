import { Da, F, Int } from '@/core/imports'

import type { ProductModel } from '@/app/use-cases/get-sorted-products'

export type Message = Da.TaggedEnum<{
	RefreshList: object
	DeleteProductsAndRefresh: object
	ClearSelectedProducts: object
	ToggleItem: { id: string }
}>

export type InternalMessage = Da.TaggedEnum<{
	DeleteProductsFailed: {
		message: string
	}
	DeleteProductsAndRefreshSucceeded: {
		deletedItems: Int.Integer
		total: Int.Integer
		models: ProductModel[]
	}
	DeleteProductsAndRefreshFailed: {
		message: string
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
		message: string
	}
	ShowToast: { message: string }
	RemoveToast: object
	RemoveToastStarted: { fiber: F.Fiber<unknown> }
}>

export const Message = Da.taggedEnum<Message>()

export const InternalMessage =
	Da.taggedEnum<InternalMessage>()
