import { Int, NETS, O } from '@/core/imports.js'

export const map = new Map<
	string,
	{
		id: string
		name: NETS.NonEmptyTrimmedString
		expirationDate: O.Option<Int.Integer>
		creationDate: Int.Integer
	}
>()
