import { io as IO, readerIO as RIO } from 'fp-ts'

export type GenerateUUID = IO.IO<string>

export type R_GenerateUUID<ENV> = RIO.ReaderIO<
	ENV,
	string
>
