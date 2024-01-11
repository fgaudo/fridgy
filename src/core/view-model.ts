import { ReaderObservable } from 'node_modules/@fgaudo/fp-ts-rxjs/dist/esm/types/ReaderObservable'
import { Observable } from 'rxjs'

export interface ViewModel<ENV, A, B> {
	readonly init: B
	readonly transformer: (
		obs: Observable<A>,
	) => ReaderObservable<ENV, B>
}
