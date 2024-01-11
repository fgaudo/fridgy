import { io as IO, readerIO as RIO } from 'fp-ts'

export type GetTimestamp = IO.IO<number>

export type R_GetTimestamp<ENV> = RIO.ReaderIO<
	ENV,
	number
>
