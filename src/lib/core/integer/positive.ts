import { O } from '../imports.ts';
import { isInteger } from './index.ts';

const _: unique symbol = Symbol();

export type PositiveInteger = number & {
	[_]: true;
};

export const isPositiveInteger = (
	value: unknown,
): value is PositiveInteger =>
	isInteger(value) && value > 0;

export const unsafe_fromNumber: (
	number: number,
) => PositiveInteger = number => {
	if (!isPositiveInteger(number)) {
		throw new Error('Not a positive integer');
	}
	return number;
};

export const fromNumber: (
	number: number,
) => O.Option<PositiveInteger> = O.liftThrowable(
	number => unsafe_fromNumber(number),
);
