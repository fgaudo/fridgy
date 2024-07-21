import { reader as R } from 'fp-ts'

import type { UseCases } from '@/app/index'

import { log } from './write/log'

export interface Deps {
	appLogPrefix: string
	uiLogPrefix: string
}

export const useCases: R.Reader<
	Deps,
	Pick<UseCases, 'appLog' | 'uiLog'>
> = ({ appLogPrefix: prefix, uiLogPrefix }) => ({
	appLog: log({ prefix }),
	uiLog: log({ prefix: uiLogPrefix }),
})
