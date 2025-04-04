import { App as CAP } from '@capacitor/app';
import { onCleanup } from 'solid-js';

const resumeCallbacks: Set<() => void> = new Set<
	() => void
>();

export const onResumeInit = async () =>
	CAP.addListener('resume', () => {
		for (const callback of resumeCallbacks) {
			callback();
		}
	});

export const onResume = (
	callback: () => void,
) => {
	resumeCallbacks.add(callback);

	onCleanup(() => {
		resumeCallbacks.delete(callback);
	});
};
