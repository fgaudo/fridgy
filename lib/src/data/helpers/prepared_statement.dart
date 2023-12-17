import 'package:functionally/builders.dart';
import 'package:functionally/reader_io.dart' as RIO;
import 'package:logging/logging.dart';
import 'package:sqlite3/common.dart';

import '../../application/commands/log.dart';
import '../commands_impl/log.dart';

typedef PreparedStatementDeps<ENV> = ({
  Logger logEnv,
  CommonDatabase db,
  ENV env
});

RIO.ReaderIO<PreparedStatementDeps<ENV>, void> preparedStatement<ENV>({
  required String sql,
  required RIO.ReaderIO<ENV, void> Function(CommonPreparedStatement ps) run,
}) =>
    ReaderIOBuilder.asks((PreparedStatementDeps<ENV> deps) => deps.db)
        .flatMapIO(
          (db) => () => db.prepare(sql),
        )
        .bracket(
          release: (ps) => ReaderIOBuilder.make<PreparedStatementDeps<ENV>>()
              .flatMapIO(
                (_) => ps.dispose,
              )
              .apFirst(
                _info(
                  'Prepared statement closed',
                ),
              )
              .build(),
          use: (ps) => ReaderIOBuilder.make<PreparedStatementDeps<ENV>>()
              .apFirst(
                _info('Prepared statement opened'),
              )
              .apSecond(
                run(ps)
                    .toReaderIOBuilder()
                    .local((PreparedStatementDeps<ENV> deps) => deps.env)
                    .build(),
              )
              .build(),
        )
        .build();

RIO.ReaderIO<PreparedStatementDeps<ENV>, void> _info<ENV>(String message) =>
    log(LogType.info, message)
        .toReaderIOBuilder()
        .local((PreparedStatementDeps<ENV> deps) => deps.logEnv)
        .build();
