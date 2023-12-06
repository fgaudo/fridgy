import 'package:functionally/extensions/reader_io.dart';
import 'package:functionally/reader_io.dart' as RIO;
import 'package:logging/logging.dart';
import 'package:sqlite3/common.dart';

import '../../application/commands/log.dart';
import '../commands/log.dart';

typedef PreparedStatementDeps<ENV> = ({
  Logger logEnv,
  CommonDatabase db,
  ENV env
});

RIO.ReaderIO<PreparedStatementDeps<ENV>, void> preparedStatement<ENV>({
  required String sql,
  required RIO.ReaderIO<ENV, void> Function(CommonPreparedStatement ps) run,
}) =>
    RIO
        .asks((PreparedStatementDeps<ENV> deps) => deps.db)
        .flatMapIO(
          (db) => () => db.prepare(sql),
        )
        .bracket(
          release: (ps) => RIO
              .make<PreparedStatementDeps<ENV>>()
              .flatMapIO(
                (_) => ps.dispose,
              )
              .flatMap(
                (_) => _info(
                  'Prepared statement closed',
                ),
              ),
          use: (ps) => RIO
              .make<PreparedStatementDeps<ENV>>()
              .flatMap(
                (_) => _info('Prepared statement opened'),
              )
              .flatMap(
                (_) => run(ps).local((deps) => deps.env),
              ),
        );

RIO.ReaderIO<PreparedStatementDeps<ENV>, void> _info<ENV>(String message) =>
    RIO.asks((PreparedStatementDeps<ENV> deps) => deps.logEnv).flatMapIO(
          log(LogType.info, message),
        );
