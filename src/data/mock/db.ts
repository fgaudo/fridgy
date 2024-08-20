import type { Int, O } from '@/core/imports'
import type { NonEmptyTrimmedString } from '@/core/non-empty-trimmed-string'

export const map = new Map<
	string,
	{
		id: string
		name: NonEmptyTrimmedString
		expirationDate: O.Option<Int.Integer>
		creationDate: Int.Integer
	}
>()
