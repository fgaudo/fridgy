import { O } from '../imports.ts';

const _: unique symbol = Symbol();

export type Integer = number & {
	[_]: true;
};

export const isInteger = (
	value: unknown,
): value is Integer => Number.isInteger(value);

export const unsafe_fromNumber: (
	number: number,
) => Integer = number => {
	if (!isInteger(number)) {
		throw new Error('Not an integer');
	}

	return number;
};

export const fromNumber: (
	number: number,
) => O.Option<Integer> = O.liftThrowable(
	unsafe_fromNumber,
);
