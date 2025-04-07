import { Logger, ParseResult } from 'effect';
import { UnknownException } from 'effect/Cause';
import { fail, succeed } from 'effect/Exit';
import type { ParseIssue } from 'effect/ParseResult';

import { Eff } from '$lib/core/imports.ts';

export const fallback: <A>(
	def: A,
) => (
	issue: ParseIssue,
) => Eff.Effect<A, ParseIssue> = def => issue =>
	Eff.gen(function* () {
		logError(
			yield* ParseResult.TreeFormatter.formatIssue(
				issue,
			),
		);
		return yield* Eff.succeed(def);
	});

export const tryPromise = <A>(
	evaluate: (
		signal?: AbortSignal,
	) => PromiseLike<A>,
): Eff.Effect<A, UnknownException> =>
	Eff.async((resolve, signal) => {
		evaluate(signal).then(
			a => {
				resolve(succeed(a));
			},
			(e: unknown) => {
				resolve(fail(new UnknownException(e)));
			},
		);
	});

const loggerLayer = Logger.replace(
	Logger.defaultLogger,
	Logger.withLeveledConsole(
		Logger.structuredLogger,
	),
);

export const effectWithLogs = (
	effect: Eff.Effect<unknown, unknown>,
) => {
	return Eff.unsandbox(
		Eff.catchTags(
			Eff.sandbox(
				effect.pipe(Eff.provide(loggerLayer)),
			),
			{
				Die: defect =>
					logError(defect.toString()),
			},
		),
	);
};

export const logInfo = (
	...message: readonly unknown[]
) =>
	Eff.logInfo(...message).pipe(
		Eff.ignoreLogged,
		Eff.forkDaemon,
	);

export const logWarning = (
	...message: readonly unknown[]
) =>
	Eff.logWarning(...message).pipe(
		Eff.ignoreLogged,
		Eff.forkDaemon,
	);

export const logError = (
	...message: readonly unknown[]
) =>
	Eff.logError(...message).pipe(
		Eff.ignoreLogged,
		Eff.forkDaemon,
	);

export const logDebug = (
	...message: readonly unknown[]
) =>
	Eff.logDebug(...message).pipe(
		Eff.ignoreLogged,
		Eff.forkDaemon,
	);
