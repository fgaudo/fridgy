import 'package:fgaudo_functional/extensions/reader/local.dart';
import 'package:fgaudo_functional/extensions/reader_io/bracket.dart';
import 'package:fgaudo_functional/extensions/reader_io/flat_map.dart';
import 'package:fgaudo_functional/reader_io.dart';
import 'package:logging/logging.dart';
import 'package:sqlite3/common.dart';

import '../../../application/commands/log.dart';
import '../../generic/commands/log.dart';

abstract class HasPreparedStatementDeps {
  ({CommonDatabase db, Logger logger}) get PREPARED_STATEMENT_DEPS;
}

ReaderIO<A, void> preparedStatement<A extends HasPreparedStatementDeps>({
  required String sql,
  required ReaderIO<A, void> Function(CommonPreparedStatement ps) use,
}) =>
    Do<A>()
        .flatMap(
          (_) => (deps) => () => deps.PREPARED_STATEMENT_DEPS.db.prepare(sql),
        )
        .bracket(
          release: (ps) => ((A _) => ps.dispose).flatMap(
            (_) => log(
              LogType.info,
              'Prepared statement closed',
            ).local((deps) => deps.PREPARED_STATEMENT_DEPS.logger),
          ),
          use: (ps) => ((A deps) => () => use(ps)(deps)()).flatMap(
            (_) => log(
              LogType.info,
              'Prepared statement closed',
            ).local((deps) => deps.PREPARED_STATEMENT_DEPS.logger),
          ),
        );
