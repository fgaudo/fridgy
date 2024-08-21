import { Da, F, NETS, O } from '@/core/imports'
import type { Integer } from '@/core/integer'

export type Message = Da.TaggedEnum<{
	AddProduct: object
	UpdateName: {
		value: string
	}
	UpdateExpirationDate: {
		value: O.Option<Integer>
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
