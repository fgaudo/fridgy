import 'package:functionally/extensions/reader_io.dart';
import 'package:functionally/reader_io.dart' as RI;
import 'package:sqlite3/common.dart';

import '../../../application/commands/log.dart';

typedef TransactionDeps<ENV, LOG> = ({CommonDatabase db, LOG logEnv, ENV env});

const String beginSQL = 'BEGIN;';
const String commitSQL = 'COMMIT;';

RI.ReaderIO<TransactionDeps<ENV, LOG>, void> transaction<ENV, LOG>(
  RI.ReaderIO<ENV, void> run, {
  required Log<LOG> log,
}) =>
    RI
        .asks((TransactionDeps<ENV, LOG> deps) => deps.db)
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
