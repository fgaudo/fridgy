import 'package:fgaudo_functional/extensions/reader/local.dart';
import 'package:fgaudo_functional/extensions/reader_io/bracket.dart';
import 'package:fgaudo_functional/extensions/reader_io/flat_map.dart';
import 'package:fgaudo_functional/extensions/reader_io/flat_map_io.dart';
import 'package:fgaudo_functional/io.dart';
import 'package:fgaudo_functional/reader_io.dart';
import 'package:sqlite3/common.dart';

import '../../../application/commands/log.dart';

typedef PreparedLog = IO<void> Function(String);

abstract class HasPreparedStatementDeps<LOG> {
  ({CommonDatabase db, LOG logEnv}) get PREPARED_STATEMENT_DEPS;
}

ReaderIO<DEPS, void>
    preparedStatement<LOG, DEPS extends HasPreparedStatementDeps<LOG>>({
  required Log<LOG> log,
  required String sql,
  required ReaderIO<DEPS, void> Function(CommonPreparedStatement ps) use,
}) =>
        Do<DEPS>()
            .flatMap((_) => asks((deps) => deps.PREPARED_STATEMENT_DEPS.db))
            .flatMapIO(
              (db) => () => db.prepare(sql),
            )
            .bracket(
              release: (ps) => Do<DEPS>()
                  .flatMapIO(
                    (_) => ps.dispose,
                  )
                  .flatMap(
                    (_) => log(LogType.info, 'Prepared statement closed')
                        .local((deps) => deps.PREPARED_STATEMENT_DEPS.logEnv),
                  ),
              use: (ps) => Do<DEPS>()
                  .flatMap((_) => ask())
                  .flatMapIO(use(ps))
                  .flatMap(
                    (_) => log(LogType.info, 'Prepared statement opened')
                        .local((deps) => deps.PREPARED_STATEMENT_DEPS.logEnv),
                  ),
            );
