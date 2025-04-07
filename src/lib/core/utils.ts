import { LogLevel } from 'effect';

import { Log, MR, O } from './imports.ts';

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

export const testRuntime = MR.make(
	Log.minimumLogLevel(LogLevel.None),
);

export type OptionOrValue<T> =
	| T
	| O.Option<T>
	| undefined;

export const asOption = <T>(
	t: T | O.Option<T> | undefined,
) => (O.isOption(t) ? t : O.fromNullable(t));
