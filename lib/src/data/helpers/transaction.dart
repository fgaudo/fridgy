import 'package:functionally/common.dart';
import 'package:functionally/reader_io.dart' as RIO;
import 'package:logging/logging.dart';
import 'package:sqlite3/common.dart';

import '../../application/commands/log.dart';
import '../commands_impl/log.dart';

typedef TransactionDeps<ENV> = ({CommonDatabase db, Logger logEnv, ENV env});

const String beginSQL = 'BEGIN;';
const String commitSQL = 'COMMIT;';

RIO.ReaderIO<TransactionDeps<ENV>, void> transaction<ENV>(
  RIO.ReaderIO<ENV, void> run,
) =>
    Builder(
      RIO.asks((TransactionDeps<ENV> deps) => deps.db),
    )
        .transform(
          RIO.flatMapIO_((db) => () => db.execute(beginSQL)),
        )
        .transform(
          RIO.apSecond_(
            (deps) => log(LogType.info, 'SQL: $beginSQL')(deps.logEnv),
          ),
        )
        .transform(
          RIO.apSecond_(
            (deps) => run(deps.env),
          ),
        )
        .transform(
          RIO.apSecond_(
            Builder(RIO.asks((TransactionDeps<ENV> deps) => deps.db))
                .transform(
                  RIO.flatMapIO_((db) => () => db.execute(commitSQL)),
                )
                .transform(
                  RIO.apFirst_(
                    (deps) => log(LogType.info, 'SQL: $beginSQL')(deps.logEnv),
                  ),
                )
                .build(),
          ),
        )
        .build();
