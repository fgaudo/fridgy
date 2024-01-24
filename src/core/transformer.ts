import type { reader as R } from 'fp-ts'
import { Observable } from 'rxjs'

export type R_Transformer<ENV, A, B> = (
	a: Observable<A>,
) => R.Reader<ENV, Observable<B>>
