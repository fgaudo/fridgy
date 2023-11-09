import 'package:fgaudo_functional/extensions/reader_io/flat_map.dart';
import 'package:fgaudo_functional/extensions/reader_io/flat_map_io.dart';
import 'package:fgaudo_functional/io.dart';
import 'package:fgaudo_functional/reader_io.dart';
import 'package:sqlite3/common.dart';

import '../../../application/commands/log.dart';

typedef TransactionLog = IO<void> Function(String);

abstract class HasTransactionDeps<LOG> {
  ({CommonDatabase db, LOG logEnv}) get TRANSACTION_DEPS;
}

const String beginSQL = 'BEGIN;';
const String commitSQL = 'COMMIT;';

ReaderIO<A, void> transaction<LOG, A extends HasTransactionDeps<LOG>>({
  required Log<LOG> log,
  required ReaderIO<A, void> run,
}) =>
    asks((A deps) => deps.TRANSACTION_DEPS.db)
        .flatMapIO((db) => () => db.execute(beginSQL))
        .flatMap((_) => asks((deps) => deps.TRANSACTION_DEPS.logEnv))
        .flatMapIO(
          log(LogType.info, 'SQL: $beginSQL'),
        )
        .flatMap(
          (_) => run,
        )
        .flatMap(
          (_) => asks((A deps) => deps.TRANSACTION_DEPS.db),
        )
        .flatMapIO((db) => () => db.execute(commitSQL))
        .flatMap((_) => asks((deps) => deps.TRANSACTION_DEPS.logEnv))
        .flatMapIO(
          log(LogType.info, 'SQL: $commitSQL'),
        );
