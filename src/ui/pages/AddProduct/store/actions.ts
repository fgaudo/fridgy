import { Da, F, NETS } from '@/core/imports'

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
	AddProductFailed: {
		message: NETS.NonEmptyTrimmedString
	}
	AddProductSucceeded: {
		name: NETS.NonEmptyTrimmedString
	}
	AddProductStarted: { fiber: F.Fiber<unknown> }
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
