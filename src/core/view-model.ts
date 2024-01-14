import { readerObservable as RO } from '@fgaudo/fp-ts-rxjs'
import { Observable } from 'rxjs'

export interface ViewModel<ENV, A, B> {
	readonly init: B
	readonly transformer: (
		obs: Observable<A>,
	) => RO.ReaderObservable<ENV, B>
}
