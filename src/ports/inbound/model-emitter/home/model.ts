import type * as Arr from 'effect/Array'
import type * as Data from 'effect/Data'
import type * as Opt from 'effect/Option'

import type * as Integer from '@/core/integer/integer.ts'
import type * as PositiveInteger from '@/core/integer/positive-integer.ts'
import type * as UnitInterval from '@/core/unit-interval.ts'
import type { Message } from '@/ports/inbound/message-dispatcher'

export type Model = Readonly<{
	canNavigateOut: boolean
	canFetch: Data.TaggedEnum<{
		True: Readonly<{ fetch: Message }>
		False: object
	}>
	productListStatus: Data.TaggedEnum<{
		Initial: { activity: 'fetching' | 'idle' }
		Error: { activity: 'fetching' | 'idle' }
		Empty: { activity: 'fetching' | 'idle' }
		Available: Readonly<{
			activity: 'fetching' | 'idle' | 'deleting'
			canDeleteSelected: Data.TaggedEnum<{
				True: Readonly<{
					deleteMessage: Message
				}>
				False: object
			}>
			canClearSelection: Data.TaggedEnum<{
				True: Readonly<{
					clearMessage: Message
				}>
				False: object
			}>
			total: PositiveInteger.PositiveInteger
			products: Arr.NonEmptyReadonlyArray<
				Data.TaggedEnum<{
					Corrupt: Readonly<{
						canToggle: Data.TaggedEnum<{ False: object }>
						maybeName: Opt.Option<string>
					}>
					Invalid: Readonly<{
						canToggle: Data.TaggedEnum<{
							True: Readonly<{ message: Message }>
							False: object
						}>
						isSelected: boolean
						id: string
						maybeName: Opt.Option<string>
					}>
					Valid: Readonly<{
						canToggle: Data.TaggedEnum<{
							True: Readonly<{ message: Message }>
							False: object
						}>
						id: string
						isSelected: boolean
						name: string
						status: Data.TaggedEnum<{
							Everlasting: object
							Stale: Readonly<{ expirationDate: Integer.Integer }>
							Fresh: Readonly<{
								expirationDate: Integer.Integer
								timeLeft: Integer.Integer
								freshnessRatio: UnitInterval.UnitInterval
							}>
						}>
					}>
				}>
			>
		}>
	}>
}>
