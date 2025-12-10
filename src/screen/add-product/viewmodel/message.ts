import * as Data from 'effect/Data'
import * as Option from 'effect/Option'

import * as Integer from '@/core/integer/integer.ts'

export type Message = Data.TaggedEnum<{
	SetName: {
		name: string
	}
	SetExpiration: { maybeExpirationDate: Option.Option<Integer.Integer> }
	StartAddProduct: object
	NoOp: object
	AddProductSucceeded: object
	AddProductFailed: object
}>

export const Message = Data.taggedEnum<Message>()
