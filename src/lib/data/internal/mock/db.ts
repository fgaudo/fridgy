import {
	Int,
	NETS,
	O,
} from '$lib/core/imports.ts';

export const map = new Map<
	string,
	{
		id: string;
		name: NETS.NonEmptyTrimmedString;
		expirationDate: O.Option<Int.Integer>;
		creationDate: Int.Integer;
	}
>();
