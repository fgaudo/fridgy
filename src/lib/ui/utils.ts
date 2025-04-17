/* eslint-disable @typescript-eslint/no-explicit-any */
import {
	type BackButtonListener,
	App as CAP,
} from '@capacitor/app';
import type { PluginListenerHandle } from '@capacitor/core';
import {
	differenceInDays,
	differenceInHours,
} from 'date-fns';
import type { Cancel } from 'effect/Runtime';
import { onDestroy } from 'svelte';

import { Eff, H } from '$lib/core/imports.ts';

export function createEffect(
	effect: Eff.Effect<unknown, unknown>,
) {
	let cancel:
		| Cancel<unknown, unknown>
		| undefined;

	let isDestroyed = false;

	onDestroy(() => {
		isDestroyed = true;

		cancel?.();
	});

	return () => {
		cancel?.();

		if (isDestroyed) {
			return;
		}

		cancel = Eff.runCallback(
			H.effectWithLogs(effect),
		);
	};
}

export function createCapacitorListener({
	event,
	cb,
}:
	| {
			event: 'resume';
			cb: () => void;
	  }
	| {
			event: 'backButton';
			cb: BackButtonListener;
	  }) {
	let listener: PluginListenerHandle | undefined;
	let isDestroyed = false;

	onDestroy(() => {
		isDestroyed = true;
		listener?.remove();
	});

	return () => {
		listener?.remove();

		if (isDestroyed) {
			return;
		}

		const promise =
			event === 'resume'
				? CAP.addListener(event, () => {
						if (isDestroyed) {
							listener?.remove();
							return;
						}
						cb();
					})
				: CAP.addListener(event, e => {
						if (isDestroyed) {
							listener?.remove();
							return;
						}
						cb(e);
					});

		promise.then(l => {
			if (isDestroyed) {
				l.remove();
				return;
			}
			listener = l;
		});
	};
}

export const formatRemainingTime = (
	from: number,
	to: number,
): string => {
	const remaining = to - from;

	if (remaining < 0) {
		return 'EXP';
	}

	const hours = differenceInHours(to, from);

	if (hours < 1) {
		return '<1h';
	}

	const days = differenceInDays(to, from);

	if (days < 1) {
		return `${hours.toString(10)}h`;
	}

	if (days <= 28) {
		return `${days.toString(10)}d`;
	}

	return `>4w`;
};
