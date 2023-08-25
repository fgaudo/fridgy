import { pipe } from 'fp-ts/lib/function'
import * as Rx from 'rxjs'

type SwitchMapFirst = <T, OUT>(
	asd: (t: T, index: number) => Rx.Observable<OUT>
) => (obs: Rx.Observable<T>) => Rx.Observable<T>

export const switchMapFirst: SwitchMapFirst = f => obs =>
	pipe(
		obs,
		Rx.switchMap((v, i) =>
			pipe(
				f(v, i),
				Rx.map(() => v)
			)
		)
	)
