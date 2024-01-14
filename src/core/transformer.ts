import { Reader } from 'fp-ts/Reader'
import { Observable } from 'rxjs'

export type R_Transformer<ENV, A, B> = (
	a: Observable<A>,
) => Reader<ENV, Observable<B>>
