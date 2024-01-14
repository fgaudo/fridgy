import * as RO from '@fgaudo/fp-ts-rxjs/ReaderObservable'
import { Observable } from 'rxjs'

export interface ViewModel<ENV, A, B> {
	readonly init: B
	readonly transformer: (
		obs: Observable<A>,
	) => RO.ReaderObservable<ENV, B>
}
