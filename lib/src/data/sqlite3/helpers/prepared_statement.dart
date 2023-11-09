import 'package:fgaudo_functional/extensions/reader_io/bracket.dart';
import 'package:fgaudo_functional/extensions/reader_io/flat_map.dart';
import 'package:fgaudo_functional/extensions/reader_io/flat_map_io.dart';
import 'package:fgaudo_functional/io.dart';
import 'package:fgaudo_functional/reader_io.dart';
import 'package:sqlite3/common.dart';

typedef PreparedLog = IO<void> Function(String);

abstract class HasPreparedStatementDeps {
  ({CommonDatabase db, PreparedLog log}) get PREPARED_STATEMENT_DEPS;
}

ReaderIO<DEPS, void> preparedStatement<DEPS extends HasPreparedStatementDeps>({
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
              .flatMapIO((_) => ps.dispose)
              .flatMap((_) => asks((deps) => deps.PREPARED_STATEMENT_DEPS.log))
              .flatMapIO(
                (log) => log('Prepared statement closed'),
              ),
          use: (ps) => Do<DEPS>()
              .flatMap((_) => ask())
              .flatMapIO(use(ps))
              .flatMap((_) => asks((deps) => deps.PREPARED_STATEMENT_DEPS.log))
              .flatMapIO(
                (log) => log('Prepared statement opened'),
              ),
        );
