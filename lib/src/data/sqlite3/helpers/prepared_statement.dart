import 'package:fgaudo_functional/extensions/reader_io/bracket.dart';
import 'package:fgaudo_functional/reader_io.dart';
import 'package:logging/logging.dart';
import 'package:sqlite3/common.dart';

import '../../../application/commands/log.dart';

abstract class HasPreparedStatementDeps {
  ({CommonDatabase db, Logger logger, Log<Logger> log})
      get PREPARED_STATEMENT_DEPS;
}

ReaderIO<A, void> preparedStatement<A extends HasPreparedStatementDeps>({
  required String sql,
  required ReaderIO<A, void> Function(CommonPreparedStatement ps) use,
}) =>
    ((A deps) => () => deps.PREPARED_STATEMENT_DEPS.db.prepare(sql)).bracket(
      release: (ps) => (deps) => () {
            ps.dispose();
            deps.PREPARED_STATEMENT_DEPS.log(
              LogType.info,
              'Prepared statement closed',
            )(deps.PREPARED_STATEMENT_DEPS.logger);
          },
      use: (ps) => (deps) => () {
            use(ps)(deps)();
            deps.PREPARED_STATEMENT_DEPS.log(
              LogType.info,
              'Prepared statement closed',
            )(deps.PREPARED_STATEMENT_DEPS.logger);
          },
    );
