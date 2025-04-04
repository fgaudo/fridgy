import { O } from './imports.ts';

const _: unique symbol = Symbol();

export type NonEmptyTrimmedString = string & {
	[_]: true;
};

export function isNonBlank(
	string: string,
): string is NonEmptyTrimmedString {
	return /\S/.test(string);
}

export const unsafe_fromString = (
	value: string,
) => {
	const string = value.trim();

	if (!isNonBlank(string)) {
		throw new Error('Not a non-empty string');
	}

	return string;
};

export const fromString = O.liftThrowable(
	(value: string) => unsafe_fromString(value),
);
