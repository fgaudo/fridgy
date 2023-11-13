import 'package:functionally/extensions/reader/local.dart';
import 'package:functionally/extensions/reader_io/asks.dart';
import 'package:functionally/extensions/reader_io/flat_map.dart';
import 'package:functionally/extensions/reader_io/flat_map_io.dart';
import 'package:functionally/reader_io.dart' as RI;
import 'package:sqlite3/common.dart';

import '../../../core/commands/log.dart';

typedef TransactionDeps<LOG, ENV> = ({CommonDatabase db, LOG logEnv, ENV env});

const String beginSQL = 'BEGIN;';
const String commitSQL = 'COMMIT;';

RI.ReaderIO<TransactionDeps<LOG, ENV>, void> transaction<LOG, ENV>(
  RI.ReaderIO<ENV, void> run, {
  Log<LOG>? log,
}) =>
    RI
        .asks((TransactionDeps<LOG, ENV> deps) => deps.db)
        .flatMapIO((db) => () => db.execute(beginSQL))
        .asks((deps) => deps.logEnv)
        .flatMapIO(
          log?.call(LogType.info, 'SQL: $beginSQL') ?? (_) => () {},
        )
        .flatMap(
          (_) => run.local((deps) => deps.env),
        )
        .asks((deps) => deps.db)
        .flatMapIO((db) => () => db.execute(commitSQL))
        .asks((deps) => deps.logEnv)
        .flatMapIO(
          log?.call(LogType.info, 'SQL: $beginSQL') ?? (_) => () {},
        );
