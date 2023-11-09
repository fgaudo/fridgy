import 'package:fgaudo_functional/extensions/reader_io/asks.dart';
import 'package:fgaudo_functional/extensions/reader_io/flat_map.dart';
import 'package:fgaudo_functional/extensions/reader_io/flat_map_io.dart';
import 'package:fgaudo_functional/io.dart';
import 'package:fgaudo_functional/reader_io.dart' as RI;
import 'package:sqlite3/common.dart';

import '../../../core/commands/log.dart';

typedef TransactionLog = IO<void> Function(String);

abstract class HasTransactionDeps<LOG> {
  ({CommonDatabase db, LOG logEnv}) get TRANSACTION_DEPS;
}

const String beginSQL = 'BEGIN;';
const String commitSQL = 'COMMIT;';

RI.ReaderIO<A, void> transaction<LOG, A extends HasTransactionDeps<LOG>>(
  RI.ReaderIO<A, void> run, {
  Log<LOG>? log,
}) =>
    RI
        .asks((A deps) => deps.TRANSACTION_DEPS.db)
        .flatMapIO((db) => () => db.execute(beginSQL))
        .asks((deps) => deps.TRANSACTION_DEPS.logEnv)
        .flatMapIO(
          log?.call(LogType.info, 'SQL: $beginSQL') ?? (_) => () {},
        )
        .flatMap(
          (_) => run,
        )
        .asks((deps) => deps.TRANSACTION_DEPS.db)
        .flatMapIO((db) => () => db.execute(commitSQL))
        .asks((deps) => deps.TRANSACTION_DEPS.logEnv)
        .flatMapIO(
          log?.call(LogType.info, 'SQL: $beginSQL') ?? (_) => () {},
        );
