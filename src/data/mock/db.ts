import type { Int, O } from '@/core/imports'

export const map = new Map<
	string,
	{
		id: string
		name: string
		expirationDate: O.Option<Int.Integer>
		creationDate: Int.Integer
	}
>()
