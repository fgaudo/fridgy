import { readerIO as RIO } from 'fp-ts'

import { R_GetTimestamp } from '@/app/queries/get-timestamp'

interface Deps {}

export const getTimestamp: R_GetTimestamp<Deps> =
	RIO.fromIO(() => new Date().getDate())
