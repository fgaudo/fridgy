import 'package:functionally/extensions/reader_io.dart';
import 'package:functionally/reader_io.dart' as RIO;
import 'package:sqlite3/common.dart';

import '../../../application/commands/log.dart';

typedef PreparedStatementDeps<ENV, LOG> = ({
  LOG logEnv,
  CommonDatabase db,
  ENV env
});

RIO.ReaderIO<PreparedStatementDeps<ENV, LOG>, void>
    preparedStatement<ENV, LOG>({
  required String sql,
  required Log<LOG> log,
  required RIO.ReaderIO<ENV, void> Function(CommonPreparedStatement ps) use,
}) =>
        RIO
            .asks((PreparedStatementDeps<ENV, LOG> deps) => deps.db)
            .flatMapIO(
              (db) => () => db.prepare(sql),
            )
            .bracket(
              release: (ps) => RIO
                  .make<PreparedStatementDeps<ENV, LOG>>()
                  .flatMapIO(
                    (_) => ps.dispose,
                  )
                  .flatMap(
                    (_) => log
                        .info(
                          'Prepared statement closed',
                        )
                        .local(
                          (deps) => deps.logEnv,
                        ),
                  ),
              use: (ps) => RIO
                  .make<PreparedStatementDeps<ENV, LOG>>()
                  .flatMap(
                    (_) => log
                        .info(
                          'Prepared statement opened',
                        )
                        .local(
                          (deps) => deps.logEnv,
                        ),
                  )
                  .flatMap(
                    (_) => use(ps).local((deps) => deps.env),
                  ),
            );
