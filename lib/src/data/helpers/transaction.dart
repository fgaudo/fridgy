import 'package:functionally/extensions/reader_io.dart';
import 'package:functionally/reader_io.dart' as RI;
import 'package:logging/logging.dart';
import 'package:sqlite3/common.dart';

import '../commands/log.dart';

typedef TransactionDeps<ENV> = ({CommonDatabase db, Logger logEnv, ENV env});

const String beginSQL = 'BEGIN;';
const String commitSQL = 'COMMIT;';

RI.ReaderIO<TransactionDeps<ENV>, void> transaction<ENV>(
  RI.ReaderIO<ENV, void> run,
) =>
    RI
        .asks((TransactionDeps<ENV> deps) => deps.db)
        .flatMapIO((db) => () => db.execute(beginSQL))
        .flatMap(
          (_) => log.info('SQL: $beginSQL').local((deps) => deps.logEnv),
        )
        .flatMap(
          (_) => run.local((deps) => deps.env),
        )
        .asks((deps) => deps.db)
        .flatMapIO((db) => () => db.execute(commitSQL))
        .flatMap(
          (_) => log.info('SQL: $beginSQL').local((deps) => deps.logEnv),
        );
