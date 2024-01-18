import * as RO from '@fgaudo/fp-ts-rxjs/ReaderObservable'
import { Observable } from 'rxjs'

export interface ViewModel<ENV, IN, OUT, INIT> {
	readonly init: INIT
	readonly transformer: (
		obs: Observable<IN>,
	) => RO.ReaderObservable<ENV, OUT>
}
