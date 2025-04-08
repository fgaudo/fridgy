import {
	type BackButtonListener,
	App as CAP,
} from '@capacitor/app';
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
	let fiber: F.RuntimeFiber<unknown, unknown>;
	let isDestroyed = false;

	onDestroy(() => {
		isDestroyed = true;

		if (fiber) {
			fiber.unsafeInterruptAsFork(fiber.id());
		}
	});

	return () => {
		if (fiber) {
			fiber.unsafeInterruptAsFork(fiber.id());
		}

		if (isDestroyed) {
			return;
		}

		fiber = Eff.runFork(H.effectWithLogs(effect));
	};
}

export function useCapacitorListener({
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
	let listener: PluginListenerHandle;
	let isDestroyed = false;

	onDestroy(() => {
		isDestroyed = true;
		if (listener) {
			listener.remove();
		}
	});

	return () => {
		if (listener) {
			listener.remove();
		}

		if (isDestroyed) {
			return;
		}

		const promise =
			event === 'resume'
				? CAP.addListener(event, () => {
						if (isDestroyed) {
							return;
						}
						cb();
					})
				: CAP.addListener(event, e => {
						if (isDestroyed) {
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
