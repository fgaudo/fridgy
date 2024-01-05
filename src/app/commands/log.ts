import { io as I, readerIO as RIO } from 'fp-ts'

import * as L from '@/app/types/log'

export type Log = (log: L.Log) => I.IO<void>

export type LogWithDeps<ENV> = (
	log: L.Log,
) => RIO.ReaderIO<ENV, void>
