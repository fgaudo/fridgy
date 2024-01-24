import type { ObservableEither } from '@fgaudo/fp-ts-rxjs/ObservableEither.js'
import type { ReaderObservableEither } from '@fgaudo/fp-ts-rxjs/ReaderObservableEither.js'

import type { ProcessDTO } from '@/app/contract/read/types/process'

export type OnceProcesses<ID> = ObservableEither<
	Error,
	ReadonlySet<ProcessDTO<ID>>
>

export type R_OnceProcesses<ENV, ID> =
	ReaderObservableEither<
		ENV,
		Error,
		ReadonlySet<ProcessDTO<ID>>
	>
