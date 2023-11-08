import 'package:fgaudo_functional/extensions/reader_io/flat_map.dart';
import 'package:fgaudo_functional/reader_io.dart';
import 'package:logging/logging.dart';
import 'package:sqlite3/common.dart';

import '../../../application/commands/log.dart';

abstract class HasTransactionDeps {
  ({CommonDatabase db, Logger logger, Log<Logger> log}) get TRANSACTION_DEPS;
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

ReaderIO<A, void> _execute<A extends HasTransactionDeps>(String string) =>
    (deps) => () {
          deps.TRANSACTION_DEPS.db.execute(string);
          deps.TRANSACTION_DEPS
              .log(LogType.info, 'SQL: $string')(deps.TRANSACTION_DEPS.logger);
        };
