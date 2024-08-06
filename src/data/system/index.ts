import { reader as R } from 'fp-ts'

import type { Contracts } from '@/app/index'

import { log } from './write/log'

export interface Deps {
	appLogPrefix: string
	uiLogPrefix: string
	isDev: boolean
}

export const implementations: R.Reader<
	Deps,
	Pick<Contracts, 'appLog' | 'uiLog'>
> = ({
	appLogPrefix: prefix,
	uiLogPrefix,
	isDev,
}) => ({
	appLog: log({ prefix, isDev }),
	uiLog: log({ prefix: uiLogPrefix, isDev }),
})
