import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export const cn = (...p: Parameters<typeof clsx>) => ({
	[twMerge(clsx(p))]: true,
})
