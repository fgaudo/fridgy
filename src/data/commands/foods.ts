import { SQLiteDBConnection } from '@capacitor-community/sqlite'
import { reader as R } from 'fp-ts'
import { flow, pipe } from 'fp-ts/lib/function'
import { Observable, of, switchMap } from 'rxjs'

import { FoodsWithDeps } from '@/app/commands/foods'

type Deps = {
	db: SQLiteDBConnection
	events: Observable<void>
}

/** TODO */
export const foods: FoodsWithDeps<Deps> = pipe(
	R.asks((deps: Deps) => deps.events),
	R.bindTo('events'),
	R.bind('db', () => R.asks((deps: Deps) => deps.db)),
	R.chain(({ db, events }) => pipe(events)),
	switchMap(db => db.query('SELECT * FROM foods where id=?'))
)
