import 'package:functionally/extensions/reader_io.dart';
import 'package:functionally/reader_io.dart' as RI;
import 'package:logging/logging.dart';
import 'package:sqlite3/common.dart';

import '../use_cases/log.dart';

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
          (_) => _info('SQL: $beginSQL'),
        )
        .flatMap(
          (_) => run.local((deps) => deps.env),
        )
        .asks((deps) => deps.db)
        .flatMapIO((db) => () => db.execute(commitSQL))
        .flatMap(
          (_) => _info('SQL: $beginSQL'),
        );

RI.ReaderIO<TransactionDeps<ENV>, void> _info<ENV>(String message) =>
    RI.asks((TransactionDeps<ENV> deps) => deps.logEnv).flatMapIO(
          log.info(message),
        );
