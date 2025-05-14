import { cubicOut } from 'svelte/easing'
import type { TransitionConfig } from 'svelte/transition'

export function scale2(
	node: Element,
	{ delay = 0, duration = 400, easing = cubicOut, start = 0, opacity = 0 } = {},
) {
	const style = getComputedStyle(node)
	const target_opacity = +style.opacity
	const transform = style.transform === `none` ? `` : style.transform
	const sd = 1 - start
	const od = target_opacity - opacity

	return {
		delay,
		duration,
		easing,
		css: (_t, u) => {
			return `
        transform: ${transform} scale(${1 - sd * u});
        opacity: ${target_opacity - od * u}
    `
		},
	} satisfies TransitionConfig
}
