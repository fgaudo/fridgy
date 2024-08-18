import { LogLevel } from 'effect'

import { Log, MR } from './imports'

export const generateHexColor = () => {
	const alphabet = 'ABCDEF0123456789'

	const randomize = () =>
		alphabet[
			Math.floor(Math.random() * alphabet.length)
		]
	return `#${randomize()}${randomize()}${randomize()}${randomize()}${randomize()}${randomize()}`
}

export const useOrCreateError =
	(message: string) => (error: unknown) =>
		error instanceof Error
			? error
			: new Error(message)

export const isInteger = (
	value: unknown,
): value is number => Number.isInteger(value)

export const testRuntime = MR.make(
	Log.minimumLogLevel(LogLevel.None),
)
