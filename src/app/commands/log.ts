import { readerIO as RIO } from 'fp-ts'

import * as L from '@/app/types/log'

export type LogWithDeps<ENV> = (
	log: L.Log,
) => RIO.ReaderIO<ENV, void>
