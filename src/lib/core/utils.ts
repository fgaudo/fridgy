import { O } from './imports.ts';

export const generateHexColor = () => {
	const alphabet = 'ABCDEF0123456789';

	const randomize = () =>
		alphabet[
			Math.floor(Math.random() * alphabet.length)
		];
	return `#${randomize()}${randomize()}${randomize()}${randomize()}${randomize()}${randomize()}`;
};

export const useOrCreateError =
	(message: string) => (error: unknown) =>
		error instanceof Error
			? error
			: new Error(message);

export type OptionOrValue<T> =
	| Value<T>
	| O.None<T>
	| undefined;

export const asOption = <T>(
	t: OptionOrValue<T>,
) => (O.isOption(t) ? t : O.fromNullable(t));

export const asUnsafeOption = <T>(
	t: OptionOrValue<T>,
) => {
	if (t === undefined) {
		return undefined;
	}

	if (!O.isOption(t)) {
		return t;
	}

	if (O.isNone(t)) {
		return undefined;
	}

	return t.value;
};

export type Value<T> = T | O.Some<T>;

export const asValue = <T>(t: Value<T>) =>
	!O.isOption(t) ? t : (t as O.Some<T>).value;
