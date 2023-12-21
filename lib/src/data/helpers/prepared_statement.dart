import 'package:functionally/common.dart';
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
    Builder(RIO.asks((PreparedStatementDeps<ENV> deps) => deps.db))
        .transform(
          RIO.flatMapIO_(
            (db) => () => db.prepare(sql),
          ),
        )
        .transform(
          RIO.bracket(
            release: (ps) => Builder(RIO.make<PreparedStatementDeps<ENV>>())
                .transform(
                  RIO.flatMapIO(
                    (_) => ps.dispose,
                  ),
                )
                .transform(
                  RIO.apFirst_(
                    (deps) => log(
                      LogType.info,
                      'Prepared statement closed',
                    )(deps.logEnv),
                  ),
                )
                .build(),
            use: (ps) => Builder(
              RIO.make<PreparedStatementDeps<ENV>>(),
            )
                .transform(
                  RIO.apFirst_(
                    (deps) => log(
                      LogType.info,
                      'Prepared statement opened',
                    )(deps.logEnv),
                  ),
                )
                .transform(
                  RIO.apSecond_(
                    (deps) => run(ps)(deps.env),
                  ),
                )
                .build(),
          ),
        )
        .build();
