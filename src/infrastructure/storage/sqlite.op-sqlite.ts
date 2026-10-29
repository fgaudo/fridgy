// The database engine on React Native: op-sqlite, with the migrations run. Effect's own driver
// (`@effect/sql-sqlite-react-native`) installs no update hook, so `sql.reactive` would never hear a write: this
// client is that driver's, with the hook, and with every statement asynchronous (op-sqlite runs them off the JS
// thread).
import * as SqliteRN from '@effect/sql-sqlite-react-native'
import * as Sqlite from '@op-engineering/op-sqlite'
import * as Effect from 'effect/Effect'
import * as Layer from 'effect/Layer'
import * as Reactivity from 'effect/reactivity/Reactivity'
import * as Semaphore from 'effect/Semaphore'
import * as Stream from 'effect/Stream'
import * as Client from 'effect/sql/SqlClient'
import type * as Connection from 'effect/sql/SqlConnection'
import { classifySqliteError, SqlError } from 'effect/sql/SqlError'
import * as Statement from 'effect/sql/Statement'
import { migrations } from './migrations.ts'

const failure = (cause: unknown, message: string) =>
  new SqlError({ reason: classifySqliteError(cause, { message, operation: 'execute' }) })

const make = Effect.gen(function*() {
  const reactivity = yield* Reactivity.Reactivity
  const db = yield* Effect.acquireRelease(
    Effect.try({
      try: () => Sqlite.open({ name: 'fridgy.sqlite' }),
      catch: (cause) => failure(cause, 'Failed to open the database'),
    }),
    (db) => Effect.sync(() => db.close()),
  )
  db.updateHook(({ table, rowId }) => {
    reactivity.invalidateUnsafe({ [table]: [String(rowId)] })
  })
  const rows = (sql: string, params: ReadonlyArray<unknown>) =>
    Effect.tryPromise({
      try: () => db.execute(sql, params as Array<Sqlite.Scalar>),
      catch: (cause) => failure(cause, 'Failed to execute statement'),
    }).pipe(Effect.map((result) => result.rows))
  const values = (sql: string, params: ReadonlyArray<unknown>) =>
    Effect.tryPromise({
      try: () => db.executeRaw(sql, params as Array<Sqlite.Scalar>),
      catch: (cause) => failure(cause, 'Failed to execute statement'),
    }).pipe(Effect.map((result) => result.rawRows))
  const transformed: Connection.Connection['execute'] = (sql, params, transform) =>
    transform === undefined ? rows(sql, params) : Effect.map(rows(sql, params), transform)
  const connection: Connection.Connection = {
    execute: transformed,
    executeRaw: rows,
    executeValues: values,
    executeValuesUnprepared: values,
    executeUnprepared: transformed,
    executeStream: () => Stream.die('executeStream not implemented'),
  }
  const { acquirer, borrower, onCommitFailure, transactionAcquirer } = Client.makeSqliteAcquirers({
    connection: Effect.succeed(connection),
    semaphore: yield* Semaphore.make(1),
  })
  return yield* Client.make({
    driver: 'sqlite-op-sqlite',
    acquirer,
    borrower,
    compiler: Statement.makeCompilerSqlite(),
    transactionAcquirer,
    onCommitFailure,
    releaseSavepoint: (name) => `RELEASE SAVEPOINT ${name}`,
    spanAttributes: [['db.system.name', 'sqlite']],
  })
})

const client = Layer.effect(Client.SqlClient, make).pipe(Layer.provide(Reactivity.layer))

export const layer = SqliteRN.SqliteMigrator.layer({
  loader: SqliteRN.SqliteMigrator.fromRecord(migrations),
}).pipe(
  Layer.provideMerge(client),
  Layer.tap(() => Effect.logInfo('Storage ready: op-sqlite, migrated', Object.keys(migrations))),
  Layer.orDie,
)
