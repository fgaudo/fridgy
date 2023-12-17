import 'package:functionally/builders.dart';
import 'package:functionally/reader_io.dart' as RI;
import 'package:logging/logging.dart';
import 'package:sqlite3/common.dart';

import '../../application/commands/log.dart';
import '../commands_impl/log.dart';

typedef TransactionDeps<ENV> = ({CommonDatabase db, Logger logEnv, ENV env});

const String beginSQL = 'BEGIN;';
const String commitSQL = 'COMMIT;';

RI.ReaderIO<TransactionDeps<ENV>, void> transaction<ENV>(
  RI.ReaderIO<ENV, void> run,
) =>
    ReaderIOBuilder.asks((TransactionDeps<ENV> deps) => deps.db)
        .flatMapIO((db) => () => db.execute(beginSQL))
        .apSecond(
          _info('SQL: $beginSQL'),
        )
        .apSecond(
          run
              .toReaderIOBuilder()
              .local((TransactionDeps<ENV> deps) => deps.env)
              .build(),
        )
        .apSecond(
          ReaderIOBuilder.asks((TransactionDeps<ENV> deps) => deps.db)
              .flatMapIO((db) => () => db.execute(commitSQL))
              .apFirst(
                _info('SQL: $beginSQL'),
              )
              .build(),
        )
        .build();

RI.ReaderIO<TransactionDeps<ENV>, void> _info<ENV>(String message) =>
    ReaderIOBuilder.asks((TransactionDeps<ENV> deps) => deps.logEnv)
        .flatMapIO(
          log(LogType.info, message),
        )
        .build();
