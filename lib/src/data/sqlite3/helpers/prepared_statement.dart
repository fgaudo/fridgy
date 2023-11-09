import 'package:fgaudo_functional/extensions/reader_io/asks.dart';
import 'package:fgaudo_functional/extensions/reader_io/bracket.dart';
import 'package:fgaudo_functional/extensions/reader_io/flat_map_io.dart';
import 'package:fgaudo_functional/io.dart';
import 'package:fgaudo_functional/reader_io.dart';
import 'package:sqlite3/common.dart';

import '../../../core/commands/log.dart';

typedef PreparedLog = IO<void> Function(String);

abstract class HasPreparedStatementDeps<LOG> {
  ({CommonDatabase db, LOG logEnv}) get PREPARED_STATEMENT_DEPS;
}

ReaderIO<DEPS, void>
    preparedStatement<LOG, DEPS extends HasPreparedStatementDeps<LOG>>({
  required String sql,
  required ReaderIO<DEPS, void> Function(CommonPreparedStatement ps) use,
  Log<LOG>? log,
}) =>
        asks((DEPS deps) => deps.PREPARED_STATEMENT_DEPS.db)
            .flatMapIO(
              (db) => () => db.prepare(sql),
            )
            .bracket(
              release: (ps) => Do<DEPS>()
                  .flatMapIO(
                    (_) => ps.dispose,
                  )
                  .asks((deps) => deps.PREPARED_STATEMENT_DEPS.logEnv)
                  .flatMapIO(
                    log?.call(LogType.info, 'Prepared statement closed') ??
                        (_) => () {},
                  ),
              use: (ps) => ask<DEPS>()
                  .flatMapIO(use(ps))
                  .asks((deps) => deps.PREPARED_STATEMENT_DEPS.logEnv)
                  .flatMapIO(
                    log?.call(LogType.info, 'Prepared statement opened') ??
                        (_) => () {},
                  ),
            );
