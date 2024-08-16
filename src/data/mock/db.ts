import type { O } from '@/core/imports'

export const map = new Map<
	string,
	{
		id: string
		name: string
		expirationDate: O.Option<number>
		creationDate: number
	}
>()
