import * as Data from 'effect/Data'
import * as Option from 'effect/Option'

import * as Integer from '@/core/integer/integer.ts'

export type Message = Data.TaggedEnum<{
	SetName: {
		name: string
	}
	SetExpiration: { maybeExpirationDate: Option.Option<Integer.Integer> }
	StartAddProduct: object
}>

export const Message = Data.taggedEnum<Message>()

type _InternalMessage = Data.TaggedEnum<{
	NoOp: object
	AddProductSucceeded: object
	AddProductFailed: object
}>

export type InternalMessage = Message | _InternalMessage

export const InternalMessage = Data.taggedEnum<InternalMessage>()
