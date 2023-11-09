import 'package:fgaudo_functional/extensions/reader_io/flat_map.dart';
import 'package:fgaudo_functional/extensions/reader_io/flat_map_io.dart';
import 'package:fgaudo_functional/io.dart';
import 'package:fgaudo_functional/reader_io.dart';
import 'package:sqlite3/common.dart';

typedef TransactionLog = IO<void> Function(String);

abstract class HasTransactionDeps {
  ({CommonDatabase db, TransactionLog log}) get TRANSACTION_DEPS;
}

ReaderIO<A, void> transaction<A extends HasTransactionDeps>(
  ReaderIO<A, void> run,
) =>
    _execute<A>('BEGIN;')
        .flatMap(
          (_) => run,
        )
        .flatMap(
          (_) => _execute('COMMIT;'),
        );

ReaderIO<A, void> _execute<A extends HasTransactionDeps>(String sql) =>
    asks((A deps) => deps.TRANSACTION_DEPS.db)
        .flatMapIO((db) => () => db.execute(sql))
        .flatMap(
          (_) => asks(
            (env) => env.TRANSACTION_DEPS.log,
          ),
        )
        .flatMapIO(
          (log) => log('SQL: $sql'),
        );
