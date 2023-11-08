import 'package:fgaudo_functional/extensions/reader_io/flat_map.dart';
import 'package:fgaudo_functional/reader_io.dart';
import 'package:logging/logging.dart';
import 'package:sqlite3/common.dart';

import '../../../application/commands/log.dart';

abstract class HasLog {
  Logger get logger;
  Log<Logger> get log;
}

abstract class HasTransactionDeps implements HasLog {
  CommonDatabase get writeDB;
}

ReaderIO<A, void> transaction<A extends HasTransactionDeps>(
  ReaderIO<A, void> run,
) =>
    execute<A>('BEGIN;')
        .flatMap(
          (_) => run,
        )
        .flatMap(
          (_) => execute('COMMIT;'),
        );

ReaderIO<A, void> execute<A extends HasTransactionDeps>(String string) =>
    (deps) => () {
          deps.writeDB.execute(string);
          deps.log(LogType.info, 'SQL: $string')(deps.logger);
        };
