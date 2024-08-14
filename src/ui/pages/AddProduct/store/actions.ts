import { Da, F } from '@/core/imports'

import type { State } from '.'

export type Message = Da.TaggedEnum<{
	AddProduct: object
	UpdateField:
		| {
				name: 'name'
				value: State['formFields']['name']
		  }
		| {
				name: 'expirationDate'
				value: State['formFields']['expirationDate']
		  }
}>

export type InternalMessage = Da.TaggedEnum<{
	RefreshDate: object
	RefreshDateSucceeded: { date: string }
	AddProductFailed: { message: string }
	AddProductSucceeded: { name: string }
	ShowToast: { message: string }
	RemoveToast: object
	RemoveToastStarted: { fiber: F.Fiber<unknown> }
}>

export const Message = Da.taggedEnum<Message>()

export const InternalMessage =
	Da.taggedEnum<InternalMessage>()
