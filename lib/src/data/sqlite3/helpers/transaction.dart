import 'package:fgaudo_functional/extensions/reader_io/bracket.dart';
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
    _execute<A>('BEGIN;')
        .flatMap(
          (_) => run,
        )
        .flatMap(
          (_) => _execute('COMMIT;'),
        );

ReaderIO<A, void> _execute<A extends HasTransactionDeps>(String string) =>
    (deps) => () {
          deps.writeDB.execute(string);
          deps.log(LogType.info, 'SQL: $string')(deps.logger);
        };

ReaderIO<A, void> preparedStatement<A extends HasTransactionDeps>({
  required String sql,
  required ReaderIO<A, void> Function(CommonPreparedStatement ps) use,
}) =>
    ((A deps) => () => deps.writeDB.prepare(sql)).bracket(
      release: (ps) => (deps) => () {
            ps.dispose();
            deps.log(
              LogType.info,
              'Prepared statement closed',
            )(deps.logger);
          },
      use: (ps) => (deps) => () {
            use(ps)(deps)();
            deps.log(
              LogType.info,
              'Prepared statement closed',
            )(deps.logger);
          },
    );
