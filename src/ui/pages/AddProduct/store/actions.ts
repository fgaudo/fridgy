import {
	Da,
	F,
	Int,
	NETS,
	O,
} from '@/core/imports'

export type Message = Da.TaggedEnum<{
	AddProduct: object
	UpdateName: {
		value: string
	}
	UpdateExpirationDate: {
		value: O.Option<Int.Integer>
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
}>

export const Message = Da.taggedEnum<Message>()

export const InternalMessage =
	Da.taggedEnum<InternalMessage>()
