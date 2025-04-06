import type { PluginListenerHandle } from '@capacitor/core';
import {
	differenceInDays,
	differenceInHours,
} from 'date-fns';
import { onDestroy } from 'svelte';

import { Eff, F, H } from '$lib/core/imports.ts';

export function useEffect(
	effect: Eff.Effect<unknown, unknown>,
) {
	let fiber: F.Fiber<unknown, unknown>;
	let isDestroyed = false;

	onDestroy(() => {
		isDestroyed = true;
		if (fiber) {
			Eff.runFork(F.interrupt(fiber));
		}
	});

	return () => {
		if (fiber) {
			Eff.runFork(F.interrupt(fiber));
		}

		if (isDestroyed) {
			return;
		}

		fiber = H.runForkWithLogs(effect);
	};
}

export function useCapacitorListener(
	handle: () => Promise<PluginListenerHandle>,
) {
	let listener: PluginListenerHandle;
	let isDestroyed = false;

	onDestroy(() => {
		isDestroyed = true;
		if (listener) {
			listener.remove();
		}
	});

	return () => {
		if (isDestroyed) {
			return;
		}

		handle().then(l => {
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
