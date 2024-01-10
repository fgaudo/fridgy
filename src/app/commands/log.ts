import { io as IO, readerIO as RIO } from 'fp-ts'

import * as L from '@/app/types/log'

export type Log = (log: L.LogDTO) => IO.IO<void>

export type R_Log<ENV> = (
	log: L.LogDTO,
) => RIO.ReaderIO<ENV, void>
