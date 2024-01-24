import * as RO from '@fgaudo/fp-ts-rxjs/ReaderObservable.js'
import { Observable } from 'rxjs'

export type ViewModel<ENV, IN, OUT> = (
	obs: Observable<IN>,
) => RO.ReaderObservable<ENV, OUT>
